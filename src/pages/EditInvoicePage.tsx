import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Receipt, ArrowLeft, Save, Plus, Trash2, Truck, User,
  Building2, MapPin, AlertCircle, RefreshCw, Check, Eye, Copy, Sparkles, Wrench
} from 'lucide-react';
import { invoicesApi } from '../api/invoicesApi';
import { crmApi } from '../api/crmApi';
import { companiesApi } from '../api/companyApi';
import type { BusinessParty, CompanyProfile } from '../types/admin';
import { calculateGstSplit, isRestroomCubicleItem } from '../utils/tax';

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

  // Lookups
  const [customers, setCustomers] = useState<BusinessParty[]>([]);
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // Form State
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [companyProfileId, setCompanyProfileId] = useState('');
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
    ewayBillNumber: '',
    placeOfSupply: 'West Bengal',
    reverseCharge: false,
  });

  // Items & Calculations
  const [items, setItems] = useState<InvoiceItemRow[]>([]);
  const [freightTerms, setFreightTerms] = useState<string>('Extra as Actual / To pay');
  const [freightAmount, setFreightAmount] = useState<number>(0);
  const [gstRate, setGstRate] = useState<number>(18);
  const [roundingAdjustment, setRoundingAdjustment] = useState<number>(0);

  // Load lookups
  useEffect(() => {
    Promise.all([
      crmApi.listCustomers({ limit: 150 }).catch(() => ({ data: { data: { items: [] } } })),
      companiesApi.list().catch(() => ({ data: { data: [] } })),
    ]).then(([custRes, compRes]) => {
      const custList = custRes.data?.data?.items || [];
      const compList = compRes.data?.data || [];
      setCustomers(custList);
      setCompanies(compList);
    });
  }, []);

  const loadInvoice = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await invoicesApi.getById(id);
      const inv = res.data?.data || (res.data as any);
      if (!inv) throw new Error('Invoice not found');

      setInvoiceNumber(inv.invoiceNumber || '');
      setIssueDate(inv.issueDate ? inv.issueDate.split('T')[0] : '');
      setDueDate(inv.dueDate ? inv.dueDate.split('T')[0] : '');
      setStatus(inv.status || 'DRAFT');
      setUserNotes(inv.metadata?.userNotes || (inv.notes && !inv.notes.startsWith('{') ? inv.notes : ''));

      const loadedCompId = inv.companyProfile?.id || inv.metadata?.companyProfileId || '';
      setCompanyProfileId(loadedCompId);

      const loadedCustId = inv.customer?.id || inv.metadata?.customerId || '';
      setSelectedCustomerId(loadedCustId);

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
        ewayBillNumber: tr.ewayBillNumber || '',
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
      setFreightTerms(inv.freightTerms || (Number(inv.freightAmount || 0) > 0 ? 'Fixed Amount' : 'Extra as Actual / To pay'));
      setRoundingAdjustment(Number(inv.roundingAdjustment || 0));
      if (inv.metadata?.gstRate !== undefined) {
        setGstRate(Number(inv.metadata.gstRate));
      }
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

  // Handle customer picker selection
  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const found = customers.find((c) => c.id === customerId);
    if (!found) return;

    const bAddr = found.addresses?.find((a: any) => a.addressType === 'BILLING' || a.isDefaultBilling) || found.addresses?.[0];
    const sAddr = found.addresses?.find((a: any) => a.addressType === 'SHIPPING' || a.isDefaultShipping) || bAddr;

    const bState = bAddr?.state || 'West Bengal';
    const bCode = bAddr?.stateCode || (found.gstin ? found.gstin.slice(0, 2) : '19');

    setBillTo({
      partyName: found.legalName || found.tradeName || '',
      address: [bAddr?.addressLine1, bAddr?.addressLine2, bAddr?.city, bAddr?.postalCode].filter(Boolean).join(', '),
      gstin: found.gstin || '',
      state: bState,
      stateCode: bCode,
    });

    setShipTo({
      partyName: found.tradeName || found.legalName || '',
      address: [sAddr?.addressLine1, sAddr?.addressLine2, sAddr?.city, sAddr?.postalCode].filter(Boolean).join(', '),
      gstin: found.gstin || '',
      state: sAddr?.state || bState,
      stateCode: sAddr?.stateCode || bCode,
    });

    setTransport((prev) => ({
      ...prev,
      placeOfSupply: bState,
    }));
  };

  // Copy Bill To details to Ship To
  const handleCopyBillToToShipTo = () => {
    setShipTo({
      partyName: billTo.partyName,
      address: billTo.address,
      gstin: billTo.gstin,
      state: billTo.state,
      stateCode: billTo.stateCode,
    });
  };

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

  const handleAddItem = (preset?: Partial<InvoiceItemRow>) => {
    setItems((prev) => [
      ...prev,
      {
        serialNumber: prev.length + 1,
        description: preset?.description || '',
        hsnSac: preset?.hsnSac || '48239019',
        quantity: preset?.quantity || 1,
        unit: preset?.unit || "No's",
        rate: preset?.rate || 0,
        amount: preset?.amount || (preset?.rate ? Number(preset.rate) * Number(preset.quantity || 1) : 0),
        gstRate: preset?.gstRate || gstRate,
      },
    ]);
  };

  const handleAddInstallationLine = () => {
    const detectedCubicles = items
      .filter((it) => isRestroomCubicleItem(it))
      .reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
    const count = detectedCubicles > 0 ? detectedCubicles : 1;
    const rate = 1000;
    handleAddItem({
      description: `Supply & Installation / Erection Charges for Restroom Cubicles (@ ₹ ${rate.toLocaleString('en-IN')}/Cubicle for ${count} Cubicle${count === 1 ? '' : 's'})`,
      hsnSac: '995469',
      quantity: count,
      unit: "No's",
      rate,
      amount: count * rate,
      gstRate,
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) =>
      prev.filter((_, i) => i !== index).map((it, idx) => ({ ...it, serialNumber: idx + 1 }))
    );
  };

  // Live Totals & Statutory GST Calculation
  const subtotal = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
  }, [items]);

  const effectiveFreightAmount = useMemo(() => {
    return freightTerms === 'Fixed Amount' ? (Number(freightAmount) || 0) : 0;
  }, [freightTerms, freightAmount]);

  const totalTaxable = useMemo(() => {
    return subtotal + effectiveFreightAmount;
  }, [subtotal, effectiveFreightAmount]);

  const selectedCompany = useMemo(() => {
    return companies.find((c) => c.id === companyProfileId) || companies[0];
  }, [companies, companyProfileId]);

  const sellerStateCode = (selectedCompany?.stateCode || (selectedCompany?.gstin ? selectedCompany.gstin.slice(0, 2) : '19')).trim();

  const gstBreakdown = useMemo(() => {
    const addressStr = shipTo.address || billTo.address || '';
    return calculateGstSplit(
      totalTaxable,
      shipTo.stateCode || billTo.stateCode || '19',
      shipTo.state || billTo.state || 'West Bengal',
      gstRate === 0,
      gstRate,
      billTo.gstin,
      addressStr,
      sellerStateCode
    );
  }, [totalTaxable, shipTo, billTo, gstRate, sellerStateCode]);

  const rawGrandTotal = useMemo(() => {
    return totalTaxable + gstBreakdown.totalTax + (Number(roundingAdjustment) || 0);
  }, [totalTaxable, gstBreakdown.totalTax, roundingAdjustment]);

  const grandTotal = useMemo(() => {
    return Math.round(rawGrandTotal);
  }, [rawGrandTotal]);

  const computedRoundOff = useMemo(() => {
    return Math.round((grandTotal - (totalTaxable + gstBreakdown.totalTax)) * 100) / 100;
  }, [grandTotal, totalTaxable, gstBreakdown.totalTax]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || saving) return;

    if (!invoiceNumber.trim()) {
      alert('Invoice / Bill Number is required.');
      return;
    }

    if (items.length === 0) {
      alert('Invoice must have at least one line item.');
      return;
    }

    setSaving(true);
    try {
      const isKolkataBranch = companyProfileId === 'a25090ef-f6c0-407f-8b1e-1da8d506308c' || selectedCompany?.entityCode === 'PPS-KOL' || invoiceNumber.startsWith('PPSK/');

      const payload = {
        invoiceNumber: invoiceNumber.trim(),
        companyProfileId: companyProfileId || undefined,
        customerId: selectedCustomerId || undefined,
        branch: isKolkataBranch ? 'KOLKATA' : 'MAIN',
        isKolkata: isKolkataBranch,
        issueDate,
        dueDate: dueDate || null,
        status,
        userNotes,
        billTo,
        shipTo,
        transport,
        vehicleNumber: transport.vehicleNumber,
        modeOfTransport: transport.modeOfTransport,
        grLrNumber: transport.grLrNumber,
        ewayBillNumber: transport.ewayBillNumber,
        placeOfSupply: transport.placeOfSupply,
        freightTerms,
        freightAmount: effectiveFreightAmount,
        roundingAdjustment: computedRoundOff,
        gstRate,
        subtotal,
        taxAmount: gstBreakdown.totalTax,
        totalAmount: grandTotal,
        items: items.map((it) => ({
          ...it,
          gstRate: it.gstRate || gstRate,
        })),
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/admin/dashboard/invoices/${id}`)}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
            title="Back to Invoice Details"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold font-mono text-white">
                Edit Bill: {invoiceNumber}
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
                Full Details Editing
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Modify line items, quantities, rates, customer parties, transport, vehicle number, and statutory tax values
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Link
            to={`/admin/dashboard/invoices/${id}`}
            className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <Receipt className="w-4 h-4 text-[#7FB706]" />
            <span>View Bill</span>
          </Link>
          <a
            href={invoicesApi.getPdfUrl(id!)}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 bg-[#7FB706]/15 hover:bg-[#7FB706]/25 text-[#7FB706] border border-[#7FB706]/30 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <Eye className="w-4 h-4" />
            <span>Preview PDF</span>
          </a>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Core Settings / Document Identity & Timeline */}
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-white/5 pb-2 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#7FB706]" />
            <span>Document Identity &amp; Timeline</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Invoice / Bill No. <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g. PPS/26-27/040"
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#7FB706]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Issuing Branch / Company Profile
              </label>
              <select
                value={companyProfileId}
                onChange={(e) => setCompanyProfileId(e.target.value)}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#7FB706]"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName} ({c.state || 'Delhi'})
                  </option>
                ))}
              </select>
            </div>

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
                Payment Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#7FB706]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Invoice Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#7FB706]"
              >
                <option value="DRAFT">DRAFT (Under Preparation)</option>
                <option value="SENT">SENT (Issued to Client)</option>
                <option value="VIEWED">VIEWED</option>
                <option value="PARTIALLY_PAID">PARTIALLY_PAID (Advance Received)</option>
                <option value="PAID">PAID (Fully Settled)</option>
                <option value="OVERDUE">OVERDUE</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Quick Select Registered Customer (Auto-fill)
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => handleSelectCustomer(e.target.value)}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#7FB706]"
              >
                <option value="">-- Choose registered customer or enter manually below --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.legalName || c.tradeName} {c.gstin ? `(${c.gstin})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Parties (Bill to & Ship to) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Bill To */}
          <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#7FB706]" />
                <span>Bill to Party</span>
              </div>
              <button
                type="button"
                onClick={handleCopyBillToToShipTo}
                className="text-[11px] text-[#7FB706] hover:text-[#95d608] font-semibold flex items-center gap-1 cursor-pointer transition lowercase tracking-normal"
                title="Copy billing details to consignee"
              >
                <Copy className="w-3 h-3" /> Copy to Ship to
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Customer / Company Legal Name</label>
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
                  onChange={(e) => {
                    const g = e.target.value.toUpperCase();
                    setBillTo({
                      ...billTo,
                      gstin: g,
                      stateCode: g.length >= 2 && /^\d{2}$/.test(g.slice(0, 2)) ? g.slice(0, 2) : billTo.stateCode,
                    });
                  }}
                  placeholder="19ABEFA9499G1ZU"
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#7FB706]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">State &amp; State Code</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <input
                    type="text"
                    value={billTo.state}
                    onChange={(e) => setBillTo({ ...billTo, state: e.target.value })}
                    placeholder="West Bengal"
                    className="col-span-2 w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-2 py-2 text-white text-xs focus:outline-none focus:border-[#7FB706]"
                  />
                  <input
                    type="text"
                    value={billTo.stateCode}
                    onChange={(e) => setBillTo({ ...billTo, stateCode: e.target.value })}
                    placeholder="19"
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-2 py-2 text-white font-mono text-xs text-center focus:outline-none focus:border-[#7FB706]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Ship To */}
          <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-400" />
                <span>Ship to Party (Consignee)</span>
              </div>
              <span className="text-[11px] text-gray-500 font-normal">Destination for delivery</span>
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
                <label className="block text-xs font-semibold text-gray-400 mb-1">Consignee GSTIN</label>
                <input
                  type="text"
                  value={shipTo.gstin}
                  onChange={(e) => {
                    const g = e.target.value.toUpperCase();
                    setShipTo({
                      ...shipTo,
                      gstin: g,
                      stateCode: g.length >= 2 && /^\d{2}$/.test(g.slice(0, 2)) ? g.slice(0, 2) : shipTo.stateCode,
                    });
                  }}
                  placeholder="Optional or same as Bill To"
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#7FB706]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">State &amp; State Code</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <input
                    type="text"
                    value={shipTo.state}
                    onChange={(e) => setShipTo({ ...shipTo, state: e.target.value })}
                    placeholder="West Bengal"
                    className="col-span-2 w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-2 py-2 text-white text-xs focus:outline-none focus:border-[#7FB706]"
                  />
                  <input
                    type="text"
                    value={shipTo.stateCode}
                    onChange={(e) => setShipTo({ ...shipTo, stateCode: e.target.value })}
                    placeholder="19"
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-2 py-2 text-white font-mono text-xs text-center focus:outline-none focus:border-[#7FB706]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transport & Dispatch Details */}
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-purple-400" />
              <span>Dispatch &amp; Transport Specifications</span>
            </h2>
            <span className="text-[11px] text-gray-500">Printed directly onto statutory tax invoice PDF</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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
              <label className="block text-xs font-semibold text-gray-400 mb-1">Vehicle No. (Printed on PDF)</label>
              <input
                type="text"
                value={transport.vehicleNumber}
                onChange={(e) => setTransport({ ...transport, vehicleNumber: e.target.value.toUpperCase() })}
                placeholder="WB 25K 4361"
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#7FB706]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">GR / LR / RR No.</label>
              <input
                type="text"
                value={transport.grLrNumber}
                onChange={(e) => setTransport({ ...transport, grLrNumber: e.target.value })}
                placeholder="LR No."
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#7FB706]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">E-Way Bill No.</label>
              <input
                type="text"
                value={transport.ewayBillNumber}
                onChange={(e) => setTransport({ ...transport, ewayBillNumber: e.target.value })}
                placeholder="e.g. 241012345678"
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#7FB706]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Place of Supply (State)</label>
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
                <option value="false">No (Normal Charge)</option>
                <option value="true">Yes (Reverse Charge)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="bg-[#121226] border border-white/5 rounded-2xl overflow-hidden p-5 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#7FB706]" />
                <span>Line Items (Goods &amp; Services)</span>
              </h2>
              <p className="text-[11px] text-gray-500 mt-0.5">Edit descriptions, HSN codes, quantities, and rates for each line item</p>
            </div>

            {/* Quick Add Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleAddItem()}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#7FB706]/15 hover:bg-[#7FB706]/25 text-[#7FB706] rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
              <button
                type="button"
                onClick={handleAddInstallationLine}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                title="Add installation line item @ ₹1000/cubicle"
              >
                <Wrench className="w-3.5 h-3.5 text-purple-400" />
                <span>+ Installation Line</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddItem({ description: "HPL Board (6'X6')", hsnSac: '48239019', unit: "No's", rate: 9180, quantity: 1 })}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-medium cursor-pointer transition-colors"
              >
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>+ HPL Board</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddItem({ description: "Restroom Cubicle System", hsnSac: '9403', unit: "No's", rate: 18500, quantity: 1 })}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-medium cursor-pointer transition-colors"
              >
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>+ Cubicle System</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddItem({ description: "SS 304 Restroom Hardware Fitting Package", hsnSac: '8302', unit: "Set", rate: 3500, quantity: 1 })}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-medium cursor-pointer transition-colors"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>+ Hardware Set</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-[#0a0a1a] text-gray-500 uppercase border-b border-white/5 font-semibold">
                <tr>
                  <th className="py-2.5 px-2 text-center w-10">#</th>
                  <th className="py-2.5 px-3 min-w-[280px]">Description of Goods / Services</th>
                  <th className="py-2.5 px-2 text-center w-28">HSN/SAC</th>
                  <th className="py-2.5 px-2 text-right w-24">Qty</th>
                  <th className="py-2.5 px-2 text-center w-28">Unit</th>
                  <th className="py-2.5 px-3 text-right w-32">Rate (₹)</th>
                  <th className="py-2.5 px-3 text-right w-36">Amount (₹)</th>
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
                        placeholder="e.g. HPL Board (6'X6') or Restroom Cubicle Partition"
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
                        onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value) || 0)}
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
                        <option value="Pair">Pair</option>
                        <option value="R.Ft.">R.Ft.</option>
                        <option value="Lot">Lot</option>
                        <option value="Pkt">Pkt</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={it.rate}
                        onChange={(e) => handleItemChange(idx, 'rate', Number(e.target.value) || 0)}
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

          {/* Freight & Statutory Calculations Summary Block */}
          <div className="border-t border-white/5 pt-4 flex flex-col lg:flex-row justify-between gap-6">
            <div className="w-full lg:w-7/12 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Freight Terms &amp; Charges
                  </label>
                  <div className="space-y-2">
                    <select
                      value={freightTerms}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFreightTerms(val);
                        if (val !== 'Fixed Amount') setFreightAmount(0);
                      }}
                      className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#7FB706]"
                    >
                      <option value="Extra as Actual / To pay">Extra as Actual / To pay</option>
                      <option value="Customer Scope">Customer Scope</option>
                      <option value="Included in Price">Included in Price</option>
                      <option value="Fixed Amount">Fixed Amount (Specify ₹)</option>
                    </select>
                    {freightTerms === 'Fixed Amount' && (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={freightAmount || ''}
                        onChange={(e) => setFreightAmount(Number(e.target.value) || 0)}
                        placeholder="Enter Freight Amount ₹"
                        className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#7FB706]"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Applicable GST Rate (%)
                  </label>
                  <select
                    value={gstRate}
                    onChange={(e) => setGstRate(Number(e.target.value))}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#7FB706]"
                  >
                    <option value={18}>18% Standard GST (9% CGST + 9% SGST / 18% IGST)</option>
                    <option value={12}>12% GST</option>
                    <option value={5}>5% GST</option>
                    <option value={28}>28% GST</option>
                    <option value={0}>0% (SEZ Exemption / LUT Export)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">
                  Internal Remarks / Notes / Terms
                </label>
                <textarea
                  rows={3}
                  value={userNotes}
                  onChange={(e) => setUserNotes(e.target.value)}
                  placeholder="Notes or terms printed on invoice / internal remarks..."
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#7FB706]"
                />
              </div>
            </div>

            {/* Statutory Calculations Box */}
            <div className="w-full lg:w-96 space-y-2 text-xs bg-[#0a0a1a] p-5 rounded-2xl border border-white/5 shadow-inner">
              <div className="font-bold uppercase tracking-wider text-gray-400 border-b border-white/5 pb-2 text-[11px] flex items-center justify-between">
                <span>Tax Breakdown &amp; Grand Total</span>
                <span className="text-[10px] text-gray-500 font-normal">
                  {gstBreakdown.isIntraState ? 'Intra-State (CGST+SGST)' : 'Inter-State (IGST)'}
                </span>
              </div>

              <div className="flex justify-between py-1 text-gray-400">
                <span>Subtotal (Line Items):</span>
                <span className="font-mono font-medium text-white">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              {freightTerms === 'Fixed Amount' && effectiveFreightAmount > 0 ? (
                <div className="flex justify-between py-1 text-gray-400">
                  <span>Add: Freight Charges:</span>
                  <span className="font-mono font-medium text-white">₹{effectiveFreightAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              ) : (
                <div className="flex justify-between py-1 text-gray-400">
                  <span>Freight Terms:</span>
                  <span className="text-gray-300 font-medium text-[11px]">{freightTerms}</span>
                </div>
              )}

              <div className="flex justify-between py-1 border-t border-white/5 text-gray-300 font-semibold">
                <span>Total Taxable Value:</span>
                <span className="font-mono text-white">₹{totalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              {gstBreakdown.isIntraState ? (
                <>
                  <div className="flex justify-between py-0.5 text-gray-400 pl-2">
                    <span>CGST @ {gstBreakdown.cgstRate}%:</span>
                    <span className="font-mono text-white">₹{gstBreakdown.cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between py-0.5 text-gray-400 pl-2">
                    <span>SGST @ {gstBreakdown.sgstRate}%:</span>
                    <span className="font-mono text-white">₹{gstBreakdown.sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between py-0.5 text-gray-400 pl-2">
                  <span>IGST @ {gstBreakdown.igstRate}%:</span>
                  <span className="font-mono text-white">₹{gstBreakdown.igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}

              <div className="flex justify-between py-1 border-t border-white/5 text-gray-400">
                <span>Rounded Off (+/-):</span>
                <span className="font-mono text-white">
                  {computedRoundOff >= 0 ? `+₹${computedRoundOff.toFixed(2)}` : `-₹${Math.abs(computedRoundOff).toFixed(2)}`}
                </span>
              </div>

              <div className="flex justify-between py-2.5 border-t border-white/10 font-bold text-sm bg-white/[0.02] -mx-2 px-2 rounded-xl mt-1">
                <span className="text-white">Invoice Grand Total:</span>
                <span className="font-mono text-[#7FB706] text-base">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
          <button
            type="button"
            onClick={() => navigate(`/admin/dashboard/invoices/${id}`)}
            className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-[#7FB706]/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Invoice Changes</span>
          </button>
        </div>
      </form>
    </div>
  );
}
