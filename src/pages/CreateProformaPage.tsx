import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  RotateCcw,
  Sparkles,
  CheckCircle2,
  DollarSign,
  HelpCircle,
  Download,
} from 'lucide-react';
import { piApi } from '../api/proformaApi';
import { crmApi } from '../api/crmApi';
import { salesQuotationsApi } from '../api/salesQuotationsApi';
import { productsMasterApi } from '../api/productsApi';
import DocumentFlowTimeline from '../components/common/DocumentFlowTimeline';
import type { BusinessParty, Product, SalesQuotation } from '../types/admin';

const LOCAL_STORAGE_KEY = 'pacific_create_proforma_v2';

interface CreateItem {
  id?: string;
  productId?: string;
  description: string;
  hsnSac: string;
  quantity: number;
  unit: string;
  rate: number;
  gstRate: number;
}

interface CreateFormData {
  customerId: string;
  quotationId?: string;
  quotationRef?: string;
  placeOfSupply: string;
  placeOfSupplyStateCode: string;
  reverseCharge: boolean;
  modeOfTransport: string;
  vehicleNumber: string;
  grLrNumber: string;
  linkedPoNumber: string;
  linkedPoDate: string;
  freightAmount: number;
  advancePercentage: number;
  billTo: {
    partyName: string;
    gstin: string;
    addressLine: string;
    state: string;
    stateCode: string;
    phone: string;
    email: string;
  };
  shipTo: {
    partyName: string;
    gstin: string;
    addressLine: string;
    state: string;
    stateCode: string;
    phone: string;
  };
  items: CreateItem[];
  terms: string[];
}

const DEFAULT_TERMS = [
  'Goods once sold will not be taken back or exchanged.',
  'If the bill is not paid by the due date, interest will be charged at 18% per annum.',
  'The seller is not responsible for any loss or damage to goods in transit.',
  'The buyer undertakes to submit prescribed statutory declarations to seller on demand.',
  'Subject to Delhi jurisdiction only.',
];

const INITIAL_FORM: CreateFormData = {
  customerId: '',
  placeOfSupply: 'Delhi',
  placeOfSupplyStateCode: '07',
  reverseCharge: false,
  modeOfTransport: 'Road',
  vehicleNumber: '',
  grLrNumber: '',
  linkedPoNumber: '',
  linkedPoDate: '',
  freightAmount: 0,
  advancePercentage: 50,
  billTo: {
    partyName: '',
    gstin: '',
    addressLine: '',
    state: 'Delhi',
    stateCode: '07',
    phone: '',
    email: '',
  },
  shipTo: {
    partyName: '',
    gstin: '',
    addressLine: '',
    state: 'Delhi',
    stateCode: '07',
    phone: '',
  },
  items: [
    {
      description: 'Modular Restroom Cubicle Partition 12mm Compact Laminate HPL',
      hsnSac: '9403',
      quantity: 4,
      unit: 'NOS',
      rate: 18500,
      gstRate: 18,
    },
    {
      description: 'Urinal Privacy Screen 12mm Chamfered with SS 304 Clamps',
      hsnSac: '9403',
      quantity: 3,
      unit: 'NOS',
      rate: 4200,
      gstRate: 18,
    },
  ],
  terms: DEFAULT_TERMS,
};

export default function CreateProformaPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<CreateFormData>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) return { ...INITIAL_FORM, ...JSON.parse(cached) };
    } catch {}
    return INITIAL_FORM;
  });

  const [lastSaved, setLastSaved] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [newTermText, setNewTermText] = useState('');

  // Dropdown lists
  const [customers, setCustomers] = useState<BusinessParty[]>([]);
  const [quotations, setQuotations] = useState<SalesQuotation[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState('');

  useEffect(() => {
    crmApi.listCustomers({ limit: 100 }).then((res) => {
      if (res.data?.data?.items) setCustomers(res.data.data.items);
    }).catch(console.error);

    salesQuotationsApi.list({ limit: 50 }).then((res) => {
      const data = res.data?.data?.items || (res.data as any)?.items || [];
      setQuotations(data);
    }).catch(console.error);

    productsMasterApi.list({ limit: 100 }).then((res) => {
      if (res.data?.data?.items) setCatalogProducts(res.data.data.items);
    }).catch(console.error);
  }, []);

  // Auto-save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(formData));
      setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch {}
  }, [formData]);

  // Reset Draft
  const handleResetDraft = () => {
    if (!confirm('Are you sure you want to reset this Proforma Invoice draft? All unsaved inputs will be cleared.')) return;
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch {}
    setFormData(INITIAL_FORM);
    setSelectedQuoteId('');
  };

  // Import from Quotation
  const handleImportQuotation = async (quoteId: string) => {
    setSelectedQuoteId(quoteId);
    if (!quoteId) return;
    try {
      const res = await salesQuotationsApi.getById(quoteId);
      const q = res.data?.data ?? (res.data as any);
      if (!q) return;

      const clientName = q.recipientName || q.customer?.legalName || '';
      const address = q.recipientAddress || q.customer?.addresses?.[0]?.addressLine1 || '';
      const phone = q.recipientPhone || q.customer?.phone || '';
      const email = q.recipientEmail || q.customer?.email || '';
      const gstin = q.customerGstin || q.customer?.gstin || '';

      const quoteItems: CreateItem[] = (q.items || []).map((it: any) => ({
        productId: it.productId,
        description: it.description || it.itemDescription || 'Pacific Restroom Cubicle',
        hsnSac: '9403',
        quantity: Number(it.quantity) || 1,
        unit: it.unit || 'NOS',
        rate: Number(it.rate ?? it.unitPrice ?? 0),
        gstRate: Number(q.gstRate || 18),
      }));

      setFormData((prev) => ({
        ...prev,
        customerId: q.customerId || prev.customerId,
        quotationId: q.id,
        quotationRef: q.referenceNumber,
        placeOfSupply: q.recipientAddress?.split(',').pop()?.trim() || prev.placeOfSupply,
        freightAmount: Number(q.freightAmount) || 0,
        billTo: {
          partyName: clientName,
          gstin,
          addressLine: address,
          state: prev.billTo.state,
          stateCode: prev.billTo.stateCode,
          phone,
          email,
        },
        shipTo: {
          partyName: clientName,
          gstin,
          addressLine: address,
          state: prev.shipTo.state,
          stateCode: prev.shipTo.stateCode,
          phone,
        },
        items: quoteItems.length > 0 ? quoteItems : prev.items,
      }));

      alert(`Successfully imported specifications and pricing from Quotation ${q.referenceNumber}!`);
    } catch (err: any) {
      alert('Failed to import quotation details.');
    }
  };

  // Customer selection auto-fill
  const handleCustomerChange = (cId: string) => {
    const selected = customers.find((c) => c.id === cId);
    setFormData((prev) => ({
      ...prev,
      customerId: cId,
      billTo: {
        ...prev.billTo,
        partyName: selected?.legalName || prev.billTo.partyName,
        gstin: selected?.gstin || prev.billTo.gstin,
        phone: selected?.phone || selected?.contactPhone || prev.billTo.phone,
        email: selected?.email || selected?.contactEmail || prev.billTo.email,
      },
    }));
  };

  // Add Item
  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          description: 'Modular Restroom Cubicle Partition 12mm Compact Laminate',
          hsnSac: '9403',
          quantity: 1,
          unit: 'NOS',
          rate: 18500,
          gstRate: 18,
        },
      ],
    }));
  };

  // Remove Item
  const handleRemoveItem = (index: number) => {
    if (formData.items.length <= 1) {
      alert('A Proforma Invoice must have at least one line item.');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // Select Catalog Product
  const handleSelectProduct = (index: number, productId: string) => {
    const prod = catalogProducts.find((p) => p.id === productId);
    if (!prod) return;
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((it, i) =>
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
      ),
    }));
  };

  // Financial calculations
  const subtotal = formData.items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.rate) || 0), 0);
  const totalTaxable = subtotal + Number(formData.freightAmount || 0);
  const totalGst = formData.items.reduce((sum, it) => {
    const itemAmount = (Number(it.quantity) || 0) * (Number(it.rate) || 0);
    return sum + itemAmount * ((Number(it.gstRate) || 18) / 100);
  }, 0) + (Number(formData.freightAmount || 0) * 0.18);
  const grandTotal = Math.round(totalTaxable + totalGst);
  const requiredAdvance = Math.round(grandTotal * (Number(formData.advancePercentage || 50) / 100));

  // Submit Proforma Creation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!formData.customerId && !formData.billTo.partyName) {
      alert('Please select a customer or enter billing party details.');
      return;
    }

    if (formData.items.length === 0) {
      alert('Please add at least one line item.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await piApi.create({
        customerId: formData.customerId,
        quotationId: formData.quotationId,
        quotationRef: formData.quotationRef,
        placeOfSupply: formData.placeOfSupply,
        placeOfSupplyStateCode: formData.placeOfSupplyStateCode,
        reverseCharge: formData.reverseCharge,
        modeOfTransport: formData.modeOfTransport,
        vehicleNumber: formData.vehicleNumber,
        grLrNumber: formData.grLrNumber,
        linkedPoNumber: formData.linkedPoNumber,
        linkedPoDate: formData.linkedPoDate || undefined,
        freightAmount: formData.freightAmount,
        advancePercentage: formData.advancePercentage,
        advanceRequiredAmount: requiredAdvance,
        billTo: formData.billTo,
        shipTo: formData.shipTo,
        items: formData.items,
        terms: formData.terms,
      });

      const created = res.data?.data ?? (res.data as any);
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } catch {}

      alert(`Success! Proforma Invoice ${created?.piNumber || ''} created.`);
      navigate(`/admin/dashboard/proforma-invoices/${created?.id}`);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to create Proforma Invoice.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-24 max-w-7xl mx-auto">
      {/* ── Top Sticky Action Bar ───────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sticky top-0 z-20 bg-[#0a0a1a]/95 backdrop-blur-md py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/dashboard/proforma-invoices"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
            title="Cancel"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-black font-mono text-white flex items-center gap-2">
              New Proforma Invoice (PI)
            </h1>
            <p className="text-xs text-gray-400 flex items-center gap-2">
              <span>Stage 02 • Sequence: <strong className="text-[#7FB706] font-mono">PPS/PI/...</strong></span>
              {lastSaved && <span>• Auto-saved draft at {lastSaved}</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDraft}
            className="px-3.5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-semibold flex items-center gap-1.5"
            title="Clear form and reset draft"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-[#030213] font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-[#7FB706]/20 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {submitting ? 'Generating PPS Invoice...' : 'Generate Proforma Invoice'}
          </button>
        </div>
      </div>

      {/* ── Document Flow Timeline (Stage 02) ───────────────────── */}
      <DocumentFlowTimeline
        currentStage={2}
        linkedDocs={{
          quotationId: formData.quotationId,
          quotationRef: formData.quotationRef,
        }}
        advanceInfo={{
          grandTotal,
          advanceRequired: requiredAdvance,
          advancePaymentStatus: 'DRAFT',
        }}
      />

      {/* ── Optional: Import from Quotation ─────────────────────── */}
      <div className="bg-gradient-to-r from-blue-950/40 via-[#121226] to-[#121226] border border-blue-500/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-blue-300 uppercase tracking-wider">Fast-Track from Quotation (Stage 01)</div>
            <p className="text-xs text-gray-400">Optionally load client, partitions, and pricing directly from an approved Quotation.</p>
          </div>
        </div>

        <div className="w-full sm:w-72">
          <select
            value={selectedQuoteId}
            onChange={(e) => handleImportQuotation(e.target.value)}
            className="w-full bg-[#0a0a1a] border border-blue-500/30 rounded-xl p-2.5 text-xs text-white font-mono focus:outline-none focus:border-blue-400"
          >
            <option value="">-- Choose Quotation to Import --</option>
            {quotations.map((q) => (
              <option key={q.id} value={q.id}>
                {q.referenceNumber || q.quotationNumber} — {q.recipientCompany || q.recipientName || 'Client'} (₹{Number(q.grandTotal).toLocaleString('en-IN')})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── 1. Client & Destination Details ─────────────────────── */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-white/5">
          <Building2 className="w-4 h-4 text-[#7FB706]" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Client &amp; Destination Details</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-300 mb-1">Select B2B Customer *</label>
            <select
              value={formData.customerId}
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
              value={formData.placeOfSupply}
              onChange={(e) => setFormData({ ...formData, placeOfSupply: e.target.value })}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">State Code (GST)</label>
            <input
              type="text"
              required
              value={formData.placeOfSupplyStateCode}
              onChange={(e) => setFormData({ ...formData, placeOfSupplyStateCode: e.target.value })}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white text-xs font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Mode of Transport</label>
            <input
              type="text"
              value={formData.modeOfTransport}
              onChange={(e) => setFormData({ ...formData, modeOfTransport: e.target.value })}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Vehicle Number</label>
            <input
              type="text"
              value={formData.vehicleNumber}
              onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
              placeholder="e.g. DL 01 AB 1234"
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Client PO Reference</label>
            <input
              type="text"
              value={formData.linkedPoNumber}
              onChange={(e) => setFormData({ ...formData, linkedPoNumber: e.target.value })}
              placeholder="e.g. PO-2026-X"
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white text-xs font-mono"
            />
          </div>

          <div className="flex items-center pt-5">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300">
              <input
                type="checkbox"
                checked={formData.reverseCharge}
                onChange={(e) => setFormData({ ...formData, reverseCharge: e.target.checked })}
                className="rounded border-white/20 text-[#7FB706] focus:ring-0"
              />
              <span>Reverse Charge Applicable</span>
            </label>
          </div>
        </div>
      </div>

      {/* ── 2. Bill To & Ship To ────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bill To */}
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-3">
          <h4 className="text-xs font-bold text-[#7FB706] uppercase tracking-wider">Billing Party (Customer Legal Details)</h4>
          <div>
            <label className="block text-[11px] text-gray-400 mb-1">Legal Company / Billing Name *</label>
            <input
              type="text"
              required
              value={formData.billTo.partyName}
              onChange={(e) => setFormData({ ...formData, billTo: { ...formData.billTo, partyName: e.target.value } })}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2 text-white text-xs font-semibold"
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-400 mb-1">Registered Billing Address</label>
            <textarea
              rows={2}
              value={formData.billTo.addressLine}
              onChange={(e) => setFormData({ ...formData, billTo: { ...formData.billTo, addressLine: e.target.value } })}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2 text-white text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-gray-400 mb-1">GSTIN</label>
              <input
                type="text"
                value={formData.billTo.gstin}
                onChange={(e) => setFormData({ ...formData, billTo: { ...formData.billTo, gstin: e.target.value.toUpperCase() } })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2 text-white text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-400 mb-1">Phone</label>
              <input
                type="text"
                value={formData.billTo.phone}
                onChange={(e) => setFormData({ ...formData, billTo: { ...formData.billTo, phone: e.target.value } })}
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
              onClick={() => setFormData({
                ...formData,
                shipTo: {
                  partyName: formData.billTo.partyName,
                  gstin: formData.billTo.gstin,
                  addressLine: formData.billTo.addressLine,
                  state: formData.billTo.state,
                  stateCode: formData.billTo.stateCode,
                  phone: formData.billTo.phone,
                },
              })}
              className="text-[10px] text-cyan-400 hover:underline cursor-pointer"
            >
              Same as Billing
            </button>
          </div>
          <div>
            <label className="block text-[11px] text-gray-400 mb-1">Site / Project Delivery Name</label>
            <input
              type="text"
              value={formData.shipTo.partyName}
              onChange={(e) => setFormData({ ...formData, shipTo: { ...formData.shipTo, partyName: e.target.value } })}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2 text-white text-xs font-semibold"
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-400 mb-1">Site Delivery Address</label>
            <textarea
              rows={2}
              value={formData.shipTo.addressLine}
              onChange={(e) => setFormData({ ...formData, shipTo: { ...formData.shipTo, addressLine: e.target.value } })}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2 text-white text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-gray-400 mb-1">Site Contact Phone</label>
              <input
                type="text"
                value={formData.shipTo.phone}
                onChange={(e) => setFormData({ ...formData, shipTo: { ...formData.shipTo, phone: e.target.value } })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2 text-white text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-400 mb-1">Site GSTIN</label>
              <input
                type="text"
                value={formData.shipTo.gstin}
                onChange={(e) => setFormData({ ...formData, shipTo: { ...formData.shipTo, gstin: e.target.value.toUpperCase() } })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2 text-white text-xs font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Line Items & Technical Specs ─────────────────────── */}
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
          {formData.items.map((it, idx) => (
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
                  onChange={(e) => setFormData({
                    ...formData,
                    items: formData.items.map((item, i) => (i === idx ? { ...item, description: e.target.value } : item)),
                  })}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2 text-white text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">HSN/SAC</label>
                  <input
                    type="text"
                    value={it.hsnSac}
                    onChange={(e) => setFormData({
                      ...formData,
                      items: formData.items.map((item, i) => (i === idx ? { ...item, hsnSac: e.target.value } : item)),
                    })}
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
                    onChange={(e) => setFormData({
                      ...formData,
                      items: formData.items.map((item, i) => (i === idx ? { ...item, quantity: Number(e.target.value) } : item)),
                    })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2 text-white text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Unit</label>
                  <select
                    value={it.unit}
                    onChange={(e) => setFormData({
                      ...formData,
                      items: formData.items.map((item, i) => (i === idx ? { ...item, unit: e.target.value } : item)),
                    })}
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
                    onChange={(e) => setFormData({
                      ...formData,
                      items: formData.items.map((item, i) => (i === idx ? { ...item, rate: Number(e.target.value) } : item)),
                    })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2 text-white text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">GST Rate</label>
                  <select
                    value={it.gstRate}
                    onChange={(e) => setFormData({
                      ...formData,
                      items: formData.items.map((item, i) => (i === idx ? { ...item, gstRate: Number(e.target.value) } : item)),
                    })}
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
                value={formData.advancePercentage}
                onChange={(e) => setFormData({ ...formData, advancePercentage: Number(e.target.value) })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white font-bold text-sm focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Freight &amp; Handling (₹)</label>
              <input
                type="number"
                min="0"
                value={formData.freightAmount}
                onChange={(e) => setFormData({ ...formData, freightAmount: Number(e.target.value) })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white font-bold text-sm focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
            <div className="font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Required Advance: ₹{requiredAdvance.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-amber-400/80">
              Required advance amount calculated automatically for tracking against incoming bank remittance before order conversion.
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
            {formData.freightAmount > 0 && (
              <div className="flex justify-between text-gray-300">
                <span>Freight &amp; Handling:</span>
                <span className="font-mono">₹{Number(formData.freightAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
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
              <span>Advance Due ({formData.advancePercentage}%):</span>
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
          <span className="text-xs text-gray-500 font-mono">{formData.terms.length} Clauses</span>
        </div>

        <div className="space-y-2">
          {formData.terms.map((t, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-[#0a0a1a] p-2.5 rounded-xl border border-white/5">
              <span className="font-mono text-gray-500 text-xs shrink-0">{idx + 1}.</span>
              <input
                type="text"
                value={t}
                onChange={(e) => setFormData({
                  ...formData,
                  terms: formData.terms.map((term, i) => (i === idx ? e.target.value : term)),
                })}
                className="flex-1 bg-transparent text-white text-xs focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setFormData({
                  ...formData,
                  terms: formData.terms.filter((_, i) => i !== idx),
                })}
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
              setFormData({ ...formData, terms: [...formData.terms, newTermText.trim()] });
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
