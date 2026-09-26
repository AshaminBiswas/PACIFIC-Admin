import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  CreditCard,
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  RefreshCw,
  Building2,
  Truck,
  Layers,
  FileText,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  HelpCircle,
} from 'lucide-react';
import { piApi } from '../api/proformaApi';
import { crmApi } from '../api/crmApi';
import { productsMasterApi } from '../api/productsApi';
import DocumentFlowTimeline from '../components/common/DocumentFlowTimeline';
import type { ProformaInvoice, BusinessParty, Product } from '../types/admin';

interface FormItem {
  id?: string;
  productId?: string;
  description: string;
  hsnSac: string;
  quantity: number;
  unit: string;
  rate: number;
  gstRate: number;
}

export default function EditProformaInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reference lists
  const [customers, setCustomers] = useState<BusinessParty[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);

  // Form State
  const [piNumber, setPiNumber] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [piDate, setPiDate] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('Delhi');
  const [placeOfSupplyStateCode, setPlaceOfSupplyStateCode] = useState('07');
  const [reverseCharge, setReverseCharge] = useState(false);
  const [modeOfTransport, setModeOfTransport] = useState('Road');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [grLrNumber, setGrLrNumber] = useState('');
  const [linkedPoNumber, setLinkedPoNumber] = useState('');
  const [linkedPoDate, setLinkedPoDate] = useState('');
  const [freightAmount, setFreightAmount] = useState<number>(0);
  const [advancePercentage, setAdvancePercentage] = useState<number>(50);
  const [advanceReceivedAmount, setAdvanceReceivedAmount] = useState<number>(0);
  const [quotationId, setQuotationId] = useState<string | undefined>(undefined);
  const [quotationRef, setQuotationRef] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string>('DRAFT');

  // Parties
  const [billTo, setBillTo] = useState({
    partyName: '',
    gstin: '',
    addressLine: '',
    state: 'Delhi',
    stateCode: '07',
    phone: '',
    email: '',
  });

  const [shipTo, setShipTo] = useState({
    partyName: '',
    gstin: '',
    addressLine: '',
    state: 'Delhi',
    stateCode: '07',
    phone: '',
  });

  // Items
  const [items, setItems] = useState<FormItem[]>([]);

  // Terms
  const [terms, setTerms] = useState<string[]>([]);
  const [newTermText, setNewTermText] = useState('');

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [piRes, custRes, prodRes] = await Promise.all([
        piApi.getById(id),
        crmApi.listCustomers({ limit: 100 }).catch(() => ({ data: { data: { items: [] } } })),
        productsMasterApi.list({ limit: 100 }).catch(() => ({ data: { data: { items: [] } } })),
      ]);

      const data = piRes.data?.data ?? (piRes.data as any);
      setCustomers(custRes.data?.data?.items || []);
      setCatalogProducts(prodRes.data?.data?.items || []);

      setPiNumber(data.piNumber || '');
      setCustomerId(data.customerId || '');
      setPiDate(data.piDate ? new Date(data.piDate).toISOString().split('T')[0] : '');
      setPlaceOfSupply(data.placeOfSupply || 'Delhi');
      setPlaceOfSupplyStateCode(data.placeOfSupplyStateCode || '07');
      setReverseCharge(Boolean(data.reverseCharge));
      setModeOfTransport(data.modeOfTransport || 'Road');
      setVehicleNumber(data.vehicleNumber || '');
      setGrLrNumber(data.grLrNumber || '');
      setLinkedPoNumber(data.linkedPoNumber || '');
      setLinkedPoDate(data.linkedPoDate ? new Date(data.linkedPoDate).toISOString().split('T')[0] : '');
      setFreightAmount(Number(data.freightAmount) || 0);
      setAdvancePercentage(Number(data.advancePercentage) || 50);
      setAdvanceReceivedAmount(Number(data.advanceReceivedAmount) || 0);
      setQuotationId(data.quotationId || undefined);
      setQuotationRef(data.quotationRef || undefined);
      setStatus(data.status || 'DRAFT');

      // Parties
      const bParty = data.parties?.find((p: any) => p.partyRole === 'BILL_TO');
      if (bParty) {
        setBillTo({
          partyName: bParty.partyName || '',
          gstin: bParty.gstin || '',
          addressLine: bParty.addressLine || '',
          state: bParty.state || 'Delhi',
          stateCode: bParty.stateCode || '07',
          phone: bParty.phone || '',
          email: bParty.email || '',
        });
      }

      const sParty = data.parties?.find((p: any) => p.partyRole === 'SHIP_TO');
      if (sParty) {
        setShipTo({
          partyName: sParty.partyName || '',
          gstin: sParty.gstin || '',
          addressLine: sParty.addressLine || '',
          state: sParty.state || 'Delhi',
          stateCode: sParty.stateCode || '07',
          phone: sParty.phone || '',
        });
      }

      // Items
      if (data.items && Array.isArray(data.items)) {
        setItems(
          data.items.map((it: any) => ({
            id: it.id,
            productId: it.productId,
            description: it.description,
            hsnSac: it.hsnSac || '9403',
            quantity: Number(it.quantity) || 1,
            unit: it.unit || 'NOS',
            rate: Number(it.rate) || 0,
            gstRate: Number(it.gstRate ?? 18),
          }))
        );
      }

      // Terms
      if (data.terms && Array.isArray(data.terms)) {
        setTerms(data.terms.map((t: any) => t.text));
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load PI for editing.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Customer change auto-fill
  const handleCustomerChange = (cId: string) => {
    setCustomerId(cId);
    const selected = customers.find((c) => c.id === cId);
    if (selected) {
      setBillTo((prev) => ({
        ...prev,
        partyName: selected.legalName,
        gstin: selected.gstin || '',
        phone: selected.phone || selected.contactPhone || '',
        email: selected.email || selected.contactEmail || '',
      }));
    }
  };

  // Add Item
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        description: 'Modular Restroom Cubicle Partition 12mm Compact Laminate',
        hsnSac: '9403',
        quantity: 1,
        unit: 'NOS',
        rate: 18500,
        gstRate: 18,
      },
    ]);
  };

  // Remove Item
  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      alert('A Proforma Invoice must have at least one line item.');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Select Catalog Product for Item
  const handleSelectProduct = (index: number, productId: string) => {
    const prod = catalogProducts.find((p) => p.id === productId);
    if (!prod) return;
    setItems((prev) =>
      prev.map((it, i) =>
        i === index
          ? {
              ...it,
              productId: prod.id,
              description: prod.name,
              hsnSac: prod.hsnSac || it.hsnSac,
              rate: prod.basePrice ? Number(prod.basePrice) : it.rate,
              gstRate: prod.gstRate ? Number(prod.gstRate) : it.gstRate,
            }
          : it
      )
    );
  };

  // Financial Calculations
  const subtotal = items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.rate) || 0), 0);
  const totalTaxable = subtotal + Number(freightAmount || 0);
  const totalGst = items.reduce((sum, it) => {
    const itemAmount = (Number(it.quantity) || 0) * (Number(it.rate) || 0);
    return sum + itemAmount * ((Number(it.gstRate) || 18) / 100);
  }, 0) + (Number(freightAmount || 0) * 0.18);
  const grandTotal = Math.round(totalTaxable + totalGst);
  const requiredAdvance = Math.round(grandTotal * (Number(advancePercentage || 50) / 100));

  // Submit Update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || submitting) return;

    if (items.length === 0) {
      alert('Please add at least one line item.');
      return;
    }

    setSubmitting(true);
    try {
      await piApi.update(id, {
        customerId,
        placeOfSupply,
        placeOfSupplyStateCode,
        reverseCharge,
        modeOfTransport,
        vehicleNumber,
        grLrNumber,
        linkedPoNumber,
        linkedPoDate: linkedPoDate || undefined,
        freightAmount,
        advancePercentage,
        advanceRequiredAmount: requiredAdvance,
        status,
        billTo,
        shipTo,
        items,
        terms,
        notes: `Updated on ${new Date().toLocaleString('en-GB')}`,
      });

      alert('Proforma Invoice updated successfully!');
      navigate(`/admin/dashboard/proforma-invoices/${id}`);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update Proforma Invoice.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 font-mono text-sm">Loading Proforma Invoice for Editing...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-[#121226] border border-red-500/20 rounded-2xl text-center space-y-4 shadow-2xl">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Error Loading PI</h2>
        <p className="text-sm text-gray-400">{error}</p>
        <Link
          to={`/admin/dashboard/proforma-invoices/${id}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Cancel &amp; Return
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-24 max-w-7xl mx-auto">
      {/* ── Action Bar ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sticky top-0 z-20 bg-[#0a0a1a]/95 backdrop-blur-md py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/admin/dashboard/proforma-invoices/${id}`)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
            title="Cancel edit"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-black font-mono text-white flex items-center gap-2">
              Edit Proforma Invoice: {piNumber}
            </h1>
            <p className="text-xs text-gray-400">Update specifications, line items, delivery site &amp; commercial terms.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`/admin/dashboard/proforma-invoices/${id}`)}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-[#030213] font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-[#7FB706]/20 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {submitting ? 'Saving Changes...' : 'Save Proforma Invoice'}
          </button>
        </div>
      </div>

      {/* ── Document Flow Timeline (Stage 02) ───────────────────── */}
      <DocumentFlowTimeline
        currentStage={2}
        linkedDocs={{
          piId: id,
          piNumber,
          quotationId,
          quotationRef,
        }}
        advanceInfo={{
          grandTotal,
          advanceRequired: requiredAdvance,
          advanceReceived: advanceReceivedAmount,
          advancePaymentStatus: status === 'ADVANCE_CLEARED' ? 'CLEARED' : 'PENDING',
        }}
      />

      {/* ── 1. Basic Information & Customer ────────────────────── */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-white/5">
          <Building2 className="w-4 h-4 text-[#7FB706]" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Client &amp; Destination Details</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-300 mb-1">Select Customer *</label>
            <select
              value={customerId}
              onChange={(e) => handleCustomerChange(e.target.value)}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white text-xs font-semibold focus:border-[#7FB706] focus:outline-none"
            >
              <option value="">-- Choose Customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.legalName} {c.gstin ? `(${c.gstin})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Place of Supply (State) *</label>
            <input
              type="text"
              required
              value={placeOfSupply}
              onChange={(e) => setPlaceOfSupply(e.target.value)}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">State Code (GST)</label>
            <input
              type="text"
              required
              value={placeOfSupplyStateCode}
              onChange={(e) => setPlaceOfSupplyStateCode(e.target.value)}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white text-xs font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Mode of Transport</label>
            <input
              type="text"
              value={modeOfTransport}
              onChange={(e) => setModeOfTransport(e.target.value)}
              placeholder="e.g. Road / Dedicated Vehicle"
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Vehicle Number</label>
            <input
              type="text"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              placeholder="e.g. DL 01 AB 1234"
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">GR / LR Number</label>
            <input
              type="text"
              value={grLrNumber}
              onChange={(e) => setGrLrNumber(e.target.value)}
              placeholder="e.g. LR-40912"
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Client PO Reference</label>
            <input
              type="text"
              value={linkedPoNumber}
              onChange={(e) => setLinkedPoNumber(e.target.value)}
              placeholder="PO-2026-X"
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white text-xs font-mono"
            />
          </div>
        </div>
      </div>

      {/* ── 2. Bill To & Ship To ────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bill To */}
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-3">
          <h4 className="text-xs font-bold text-[#7FB706] uppercase tracking-wider">Billing Party (Customer Legal Details)</h4>
          <div>
            <label className="block text-[11px] text-gray-400 mb-1">Legal Company / Billing Name</label>
            <input
              type="text"
              value={billTo.partyName}
              onChange={(e) => setBillTo({ ...billTo, partyName: e.target.value })}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2 text-white text-xs font-semibold"
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-400 mb-1">Registered Billing Address</label>
            <textarea
              rows={2}
              value={billTo.addressLine}
              onChange={(e) => setBillTo({ ...billTo, addressLine: e.target.value })}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2 text-white text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-gray-400 mb-1">GSTIN</label>
              <input
                type="text"
                value={billTo.gstin}
                onChange={(e) => setBillTo({ ...billTo, gstin: e.target.value.toUpperCase() })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2 text-white text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-400 mb-1">Phone</label>
              <input
                type="text"
                value={billTo.phone}
                onChange={(e) => setBillTo({ ...billTo, phone: e.target.value })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2 text-white text-xs"
              />
            </div>
          </div>
        </div>

        {/* Ship To */}
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Shipping / Delivery Site</h4>
            <button
              type="button"
              onClick={() => setShipTo({ ...shipTo, partyName: billTo.partyName, addressLine: billTo.addressLine, gstin: billTo.gstin, state: billTo.state, stateCode: billTo.stateCode, phone: billTo.phone })}
              className="text-[10px] text-cyan-400 hover:underline cursor-pointer"
            >
              Same as Billing
            </button>
          </div>
          <div>
            <label className="block text-[11px] text-gray-400 mb-1">Site / Project Delivery Name</label>
            <input
              type="text"
              value={shipTo.partyName}
              onChange={(e) => setShipTo({ ...shipTo, partyName: e.target.value })}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2 text-white text-xs font-semibold"
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-400 mb-1">Site Delivery Address</label>
            <textarea
              rows={2}
              value={shipTo.addressLine}
              onChange={(e) => setShipTo({ ...shipTo, addressLine: e.target.value })}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2 text-white text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-gray-400 mb-1">Site GSTIN (if SEZ/Diff)</label>
              <input
                type="text"
                value={shipTo.gstin}
                onChange={(e) => setShipTo({ ...shipTo, gstin: e.target.value.toUpperCase() })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2 text-white text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-400 mb-1">Site Contact Phone</label>
              <input
                type="text"
                value={shipTo.phone}
                onChange={(e) => setShipTo({ ...shipTo, phone: e.target.value })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2 text-white text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Line Items Editor ───────────────────────────────── */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#7FB706]" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Line Items &amp; Technical Specifications</h3>
          </div>
          <button
            type="button"
            onClick={handleAddItem}
            className="px-3 py-1.5 bg-[#7FB706]/15 hover:bg-[#7FB706]/25 text-[#7FB706] border border-[#7FB706]/30 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Line Item
          </button>
        </div>

        <div className="space-y-3">
          {items.map((it, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#7FB706]">Item #{idx + 1}</span>
                {catalogProducts.length > 0 && (
                  <select
                    onChange={(e) => handleSelectProduct(idx, e.target.value)}
                    defaultValue=""
                    className="bg-[#0a0a1a] border border-white/10 rounded-lg p-1 text-[11px] text-gray-300"
                  >
                    <option value="" disabled>Load from Product Master...</option>
                    {catalogProducts.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveItem(idx)}
                  className="p-1 rounded text-red-400 hover:bg-red-500/10 cursor-pointer"
                  title="Remove Item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Description &amp; Specifications</label>
                <input
                  type="text"
                  required
                  value={it.description}
                  onChange={(e) => setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, description: e.target.value } : item)))}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2 text-white text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">HSN/SAC</label>
                  <input
                    type="text"
                    value={it.hsnSac}
                    onChange={(e) => setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, hsnSac: e.target.value } : item)))}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2 text-white text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={it.quantity}
                    onChange={(e) => setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, quantity: Number(e.target.value) } : item)))}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2 text-white text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Unit</label>
                  <select
                    value={it.unit}
                    onChange={(e) => setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, unit: e.target.value } : item)))}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2 text-white text-xs"
                  >
                    <option value="NOS">NOS</option>
                    <option value="SET">SET</option>
                    <option value="SQFT">SQFT</option>
                    <option value="SQM">SQM</option>
                    <option value="RMT">RMT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Rate (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={it.rate}
                    onChange={(e) => setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, rate: Number(e.target.value) } : item)))}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2 text-white text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">GST Rate</label>
                  <select
                    value={it.gstRate}
                    onChange={(e) => setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, gstRate: Number(e.target.value) } : item)))}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2 text-white text-xs font-mono"
                  >
                    <option value="18">18%</option>
                    <option value="12">12%</option>
                    <option value="5">5%</option>
                    <option value="28">28%</option>
                    <option value="0">0% (SEZ/Exempt)</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 4. Advance Settings & Financial Summary Dock ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Advance Terms */}
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-white/5">
            <CreditCard className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Advance Payment Policy</h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Advance Percentage (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={advancePercentage}
                onChange={(e) => setAdvancePercentage(Number(e.target.value))}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white font-bold text-sm focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Freight &amp; Handling (₹)</label>
              <input
                type="number"
                min="0"
                value={freightAmount}
                onChange={(e) => setFreightAmount(Number(e.target.value))}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white font-bold text-sm focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
            <div className="font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Required Advance: ₹{requiredAdvance.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-amber-400/80">
              Client must remit this amount before the factory team queues raw material sizing and hardware kitting.
            </p>
          </div>
        </div>

        {/* Live Calculation Dock */}
        <div className="bg-[#0e0e22] border border-white/10 rounded-2xl p-5 space-y-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Financial Summary</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-gray-300">
              <span>Items Subtotal:</span>
              <span className="font-mono">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            {freightAmount > 0 && (
              <div className="flex justify-between text-gray-300">
                <span>Freight &amp; Handling:</span>
                <span className="font-mono">₹{freightAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-300">
              <span>Estimated GST (18%):</span>
              <span className="font-mono">₹{totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-base font-black text-[#7FB706] pt-2 border-t border-white/10">
              <span>Grand Total:</span>
              <span className="font-mono">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-amber-400 pt-1 border-t border-white/5">
              <span>Advance Due ({advancePercentage}%):</span>
              <span className="font-mono">₹{requiredAdvance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. Terms & Conditions ──────────────────────────────── */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Commercial Clauses &amp; Terms</h3>
          </div>
          <span className="text-xs text-gray-500 font-mono">{terms.length} Clauses</span>
        </div>

        <div className="space-y-2">
          {terms.map((t, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-[#0a0a1a] p-2.5 rounded-xl border border-white/5">
              <span className="font-mono text-gray-500 text-xs shrink-0">{idx + 1}.</span>
              <input
                type="text"
                value={t}
                onChange={(e) => setTerms((prev) => prev.map((term, i) => (i === idx ? e.target.value : term)))}
                className="flex-1 bg-transparent text-white text-xs focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setTerms((prev) => prev.filter((_, i) => i !== idx))}
                className="p-1 rounded text-red-400 hover:bg-red-500/10 cursor-pointer shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="text"
            placeholder="Add another customized commercial clause..."
            value={newTermText}
            onChange={(e) => setNewTermText(e.target.value)}
            className="flex-1 bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white text-xs"
          />
          <button
            type="button"
            onClick={() => {
              if (!newTermText.trim()) return;
              setTerms([...terms, newTermText.trim()]);
              setNewTermText('');
            }}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            Add Clause
          </button>
        </div>
      </div>
    </form>
  );
}
