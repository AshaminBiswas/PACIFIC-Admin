import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, RotateCcw, CheckCircle2, FileText, Plus, Trash2 } from 'lucide-react';
import { exportApi } from '../../api/exportApi';
import type { BusinessParty, ExportCountry, ExportIncoterm, ExportPort, ExportHsCode } from '../../types/admin';

const QUOTATION_KEY = 'pacific_create_export_quotation_v1';
const RFQ_KEY = 'pacific_create_export_rfq_v1';

interface QuoteItem {
  description: string;
  hsCodeId: string;
  quantity: number;
  unit: string;
  unitRate: number;
  totalAmount: number;
  cbm: number;
  grossWeightKg: number;
  netWeightKg?: number;
}

interface QuotationFormData {
  partyId: string;
  countryId: string;
  incotermId: string;
  portOfDestinationId: string;
  currency: string;
  exchangeRate: number;
  validUntil: string;
  paymentTerms: string;
  deliveryTerms: string;
  freightCharges: number;
  insuranceCharges: number;
  otherCharges: number;
  notes: string;
  items: QuoteItem[];
}

interface RfqFormData {
  partyId: string;
  countryId: string;
  incotermId: string;
  destinationPortId: string;
  currency: string;
  estimatedValue: number;
  notes: string;
}

const INITIAL_QUOTE: QuotationFormData = {
  partyId: '',
  countryId: '',
  incotermId: '',
  portOfDestinationId: '',
  currency: 'USD',
  exchangeRate: 85.0,
  validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  paymentTerms: '30% Advance, 70% against BL copy',
  deliveryTerms: '3-4 weeks from advance receipt',
  freightCharges: 0,
  insuranceCharges: 0,
  otherCharges: 0,
  notes: 'Material: Compact Grade Solid Phenolic HPL Board with SS304 Hardware',
  items: [
    {
      description: 'Pacific 12mm Compact Laminate Restroom Cubicle System',
      hsCodeId: '',
      quantity: 50,
      unit: 'SETS',
      unitRate: 450,
      totalAmount: 22500,
      cbm: 12.5,
      grossWeightKg: 4200,
    },
  ],
};

const INITIAL_RFQ: RfqFormData = {
  partyId: '',
  countryId: '',
  incotermId: '',
  destinationPortId: '',
  currency: 'USD',
  estimatedValue: 25000,
  notes: 'Customer requires urgent price estimate for 45 cubicles in Dubai',
};

export default function CreateExportQuotationPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const formType = searchParams.get('type') === 'rfq' ? 'rfq' : 'quotation';

  const [lastSavedTime, setLastSavedTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lookups
  const [customers, setCustomers] = useState<BusinessParty[]>([]);
  const [countries, setCountries] = useState<ExportCountry[]>([]);
  const [incoterms, setIncoterms] = useState<ExportIncoterm[]>([]);
  const [ports, setPorts] = useState<ExportPort[]>([]);
  const [hsCodes, setHsCodes] = useState<ExportHsCode[]>([]);

  // State for Quotation
  const [quoteForm, setQuoteForm] = useState<QuotationFormData>(() => {
    try {
      const cached = localStorage.getItem(QUOTATION_KEY);
      if (cached) return { ...INITIAL_QUOTE, ...JSON.parse(cached) };
    } catch {}
    return INITIAL_QUOTE;
  });

  // State for RFQ
  const [rfqForm, setRfqForm] = useState<RfqFormData>(() => {
    try {
      const cached = localStorage.getItem(RFQ_KEY);
      if (cached) return { ...INITIAL_RFQ, ...JSON.parse(cached) };
    } catch {}
    return INITIAL_RFQ;
  });

  // Auto-save Quote
  useEffect(() => {
    if (formType === 'quotation') {
      try {
        localStorage.setItem(QUOTATION_KEY, JSON.stringify(quoteForm));
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } catch {}
    }
  }, [quoteForm, formType]);

  // Auto-save RFQ
  useEffect(() => {
    if (formType === 'rfq') {
      try {
        localStorage.setItem(RFQ_KEY, JSON.stringify(rfqForm));
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } catch {}
    }
  }, [rfqForm, formType]);

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [cRes, cntRes, incRes, pRes, hsRes] = await Promise.all([
          exportApi.listCustomers({ limit: 100 }),
          exportApi.listCountries(),
          exportApi.listIncoterms(),
          exportApi.listPorts(),
          exportApi.listHsCodes(),
        ]);
        if (cRes.data.success && cRes.data.data) setCustomers(cRes.data.data.items);
        if (cntRes.data.success && cntRes.data.data) setCountries(cntRes.data.data);
        if (incRes.data.success && incRes.data.data) setIncoterms(incRes.data.data);
        if (pRes.data.success && pRes.data.data) setPorts(pRes.data.data);
        if (hsRes.data.success && hsRes.data.data) setHsCodes(hsRes.data.data);
      } catch (err) {
        console.error('Failed to load lookups', err);
      }
    };
    loadLookups();
  }, []);

  const handleReset = () => {
    if (window.confirm('Reset this draft? All inputs will be cleared.')) {
      if (formType === 'quotation') {
        localStorage.removeItem(QUOTATION_KEY);
        setQuoteForm(INITIAL_QUOTE);
      } else {
        localStorage.removeItem(RFQ_KEY);
        setRfqForm(INITIAL_RFQ);
      }
    }
  };

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteForm.partyId) {
      alert('Please select a customer');
      return;
    }
    try {
      setIsSubmitting(true);
      const subtotal = quoteForm.items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitRate) || 0), 0);
      const totalAmount =
        subtotal +
        (Number(quoteForm.freightCharges) || 0) +
        (Number(quoteForm.insuranceCharges) || 0) +
        (Number(quoteForm.otherCharges) || 0);

      const payload = {
        ...quoteForm,
        countryId: quoteForm.countryId || null,
        incotermId: quoteForm.incotermId || null,
        portOfDestinationId: quoteForm.portOfDestinationId || null,
        validUntil: quoteForm.validUntil ? new Date(quoteForm.validUntil).toISOString() : null,
        freightCharges: Number(quoteForm.freightCharges) || 0,
        insuranceCharges: Number(quoteForm.insuranceCharges) || 0,
        otherCharges: Number(quoteForm.otherCharges) || 0,
        exchangeRate: Number(quoteForm.exchangeRate) || 1,
        subtotal,
        totalAmount,
        fobValue: subtotal,
        items: quoteForm.items.map((it) => ({
          ...it,
          hsCodeId: it.hsCodeId || null,
          quantity: Number(it.quantity) || 1,
          unitRate: Number(it.unitRate) || 0,
          totalAmount: (Number(it.quantity) || 1) * (Number(it.unitRate) || 0),
          cbm: Number(it.cbm) || 0,
          grossWeightKg: Number(it.grossWeightKg) || 0,
          netWeightKg: Number(it.netWeightKg) || 0,
        })),
      };
      const res = await exportApi.createQuotation(payload);
      if (res.data.success) {
        localStorage.removeItem(QUOTATION_KEY);
        alert('Created export quotation successfully!');
        navigate('/admin/dashboard/export/quotations');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to create export quotation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateRfq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rfqForm.partyId) {
      alert('Please select a customer');
      return;
    }
    try {
      setIsSubmitting(true);
      const payload = {
        ...rfqForm,
        countryId: rfqForm.countryId || null,
        incotermId: rfqForm.incotermId || null,
        destinationPortId: rfqForm.destinationPortId || null,
        estimatedValue: Number(rfqForm.estimatedValue) || 0,
      };
      const res = await exportApi.createRfq(payload);
      if (res.data.success) {
        localStorage.removeItem(RFQ_KEY);
        alert('Created RFQ successfully!');
        navigate('/admin/dashboard/export/quotations');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to record RFQ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuoteItemChange = (index: number, field: string, value: any) => {
    const updated = [...quoteForm.items];
    const item = { ...updated[index], [field]: value };
    if (field === 'quantity' || field === 'unitRate') {
      item.totalAmount = (Number(item.quantity) || 0) * (Number(item.unitRate) || 0);
    }
    updated[index] = item;
    setQuoteForm({ ...quoteForm, items: updated });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#121226] border border-white/5 p-4 sm:p-6 rounded-2xl">
        <div className="flex items-center gap-3">
          <Link to="/admin/dashboard/export/quotations" className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition flex items-center justify-center min-h-[44px] min-w-[44px]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-[#7FB706]" />
              {formType === 'quotation' ? 'New Export Quotation' : 'Record Inbound RFQ'}
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
              {formType === 'quotation' ? 'Multi-Currency Proforma and Costing' : 'Capture international request for quote'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs">
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Saved in Local Storage</span>
            {lastSavedTime && <span className="text-[11px] opacity-80">({lastSavedTime})</span>}
          </div>
          <button type="button" onClick={handleReset} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 min-h-[40px] transition">
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Draft</span>
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setSearchParams({ type: 'quotation' })}
          className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition ${
            formType === 'quotation' ? 'bg-[#7FB706] text-[#030213]' : 'bg-[#121226] text-gray-400 hover:text-white'
          }`}
        >
          Generate Quotation
        </button>
        <button
          type="button"
          onClick={() => setSearchParams({ type: 'rfq' })}
          className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition ${
            formType === 'rfq' ? 'bg-[#7FB706] text-[#030213]' : 'bg-[#121226] text-gray-400 hover:text-white'
          }`}
        >
          Record Inbound RFQ
        </button>
      </div>

      {formType === 'quotation' ? (
        <form onSubmit={handleCreateQuotation} className="bg-[#121226] border border-white/5 rounded-2xl p-5 sm:p-6 space-y-6">
          <h3 className="text-sm font-bold text-white border-b border-white/10 pb-2 mb-4">Customer & Routing</h3>
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Foreign Buyer *</label>
                <select
                  required
                  value={quoteForm.partyId}
                  onChange={(e) => setQuoteForm({ ...quoteForm, partyId: e.target.value })}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                >
                  <option value="">Select Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.legalName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Destination Country</label>
                <select
                  value={quoteForm.countryId}
                  onChange={(e) => setQuoteForm({ ...quoteForm, countryId: e.target.value })}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                >
                  <option value="">Select Country</option>
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.countryCode})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Incoterms 2020</label>
                <select
                  value={quoteForm.incotermId}
                  onChange={(e) => setQuoteForm({ ...quoteForm, incotermId: e.target.value })}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                >
                  <option value="">Select Incoterm</option>
                  {incoterms.map((i) => (
                    <option key={i.id} value={i.id}>{i.code} - {i.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Port of Destination</label>
                <select
                  value={quoteForm.portOfDestinationId}
                  onChange={(e) => setQuoteForm({ ...quoteForm, portOfDestinationId: e.target.value })}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                >
                  <option value="">Select Port</option>
                  {ports.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.portCode})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Currency & Rate</label>
                <div className="flex gap-2">
                  <select
                    value={quoteForm.currency}
                    onChange={(e) => setQuoteForm({ ...quoteForm, currency: e.target.value })}
                    className="bg-[#0a0a1a] border border-white/10 rounded-xl px-2 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="AED">AED (د.إ)</option>
                    <option value="SAR">SAR (﷼)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                  <input
                    type="number"
                    step="0.1"
                    value={quoteForm.exchangeRate}
                    onChange={(e) => setQuoteForm({ ...quoteForm, exchangeRate: parseFloat(e.target.value) || 1 })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                    placeholder="Rate"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center mt-6">
            <h3 className="text-sm font-bold text-white border-b border-white/10 pb-2 w-full mb-4">Product Line Items</h3>
            <button
              type="button"
              onClick={() => setQuoteForm({
                ...quoteForm,
                items: [
                  ...quoteForm.items,
                  { description: '', hsCodeId: '', quantity: 1, unit: 'SETS', unitRate: 0, totalAmount: 0, cbm: 0, grossWeightKg: 0 }
                ]
              })}
              className="absolute right-6 mt-[-10px] px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#7FB706] font-bold text-xs flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Product
            </button>
          </div>

          <div className="space-y-4">
            {quoteForm.items.map((item, idx) => (
              <div key={idx} className="bg-[#0a0a1a] border border-white/10 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center gap-3">
                  <input
                    required
                    type="text"
                    placeholder="Product Description"
                    value={item.description}
                    onChange={(e) => handleQuoteItemChange(idx, 'description', e.target.value)}
                    className="flex-1 bg-[#121226] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                  />
                  {quoteForm.items.length > 1 && (
                    <button type="button" onClick={() => {
                      const updated = [...quoteForm.items];
                      updated.splice(idx, 1);
                      setQuoteForm({ ...quoteForm, items: updated });
                    }} className="p-2 text-red-400 hover:text-red-300">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Quantity</label>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleQuoteItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#121226] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Unit</label>
                    <input
                      type="text"
                      value={item.unit}
                      onChange={(e) => handleQuoteItemChange(idx, 'unit', e.target.value)}
                      className="w-full bg-[#121226] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Unit Rate ({quoteForm.currency})</label>
                    <input
                      type="number"
                      value={item.unitRate}
                      onChange={(e) => handleQuoteItemChange(idx, 'unitRate', parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#121226] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Item Subtotal</label>
                    <div className="py-2 text-right font-bold text-white text-sm">
                      {quoteForm.currency} {(item.quantity * item.unitRate).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-end gap-3 mt-6">
            <Link to="/admin/dashboard/export/quotations" className="w-full sm:w-auto px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl min-h-[48px] flex items-center justify-center gap-2 transition">Cancel</Link>
            <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto px-6 py-3 bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold rounded-xl shadow-lg shadow-[#7FB706]/20 min-h-[48px] flex items-center justify-center gap-2 transition disabled:opacity-50">
              <CheckCircle2 className="w-5 h-5" />
              {isSubmitting ? 'Saving...' : 'Create Quotation'}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleCreateRfq} className="bg-[#121226] border border-white/5 rounded-2xl p-5 sm:p-6 space-y-6">
          <h3 className="text-sm font-bold text-white border-b border-white/10 pb-2 mb-4">RFQ Details</h3>
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Foreign Buyer *</label>
                <select
                  required
                  value={rfqForm.partyId}
                  onChange={(e) => setRfqForm({ ...rfqForm, partyId: e.target.value })}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                >
                  <option value="">Select Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.legalName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Country</label>
                <select
                  value={rfqForm.countryId}
                  onChange={(e) => setRfqForm({ ...rfqForm, countryId: e.target.value })}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                >
                  <option value="">Select Country</option>
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Incoterms</label>
                <select
                  value={rfqForm.incotermId}
                  onChange={(e) => setRfqForm({ ...rfqForm, incotermId: e.target.value })}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                >
                  <option value="">Select Incoterm</option>
                  {incoterms.map((i) => (
                    <option key={i.id} value={i.id}>{i.code}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Est. Value (USD)</label>
                <input
                  type="number"
                  value={rfqForm.estimatedValue}
                  onChange={(e) => setRfqForm({ ...rfqForm, estimatedValue: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Requirements / Notes</label>
              <textarea
                rows={4}
                value={rfqForm.notes}
                onChange={(e) => setRfqForm({ ...rfqForm, notes: e.target.value })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-end gap-3 mt-6">
            <Link to="/admin/dashboard/export/quotations?type=rfq" className="w-full sm:w-auto px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl min-h-[48px] flex items-center justify-center gap-2 transition">Cancel</Link>
            <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto px-6 py-3 bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold rounded-xl shadow-lg shadow-[#7FB706]/20 min-h-[48px] flex items-center justify-center gap-2 transition disabled:opacity-50">
              <CheckCircle2 className="w-5 h-5" />
              {isSubmitting ? 'Saving...' : 'Record RFQ'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
