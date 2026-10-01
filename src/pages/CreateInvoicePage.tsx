import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, RotateCcw, CheckCircle2, Plus, Trash2, Building2, MapPin, Receipt, ShieldCheck, Wrench } from 'lucide-react';
import { invoicesApi, crmApi, salesOrdersApi } from '../api/services';
import DocumentFlowTimeline from '../components/common/DocumentFlowTimeline';
import type { BusinessParty, SalesOrder } from '../types/admin';
import { calculateGstSplit, isRestroomCubicleItem } from '../utils/tax';

const LOCAL_STORAGE_KEY = 'pacific_create_invoice_v2';

interface InvoiceItemRow {
  serialNumber: number;
  description: string;
  hsnSac: string;
  quantity: number;
  rate: number;
  amount: number;
  gstRate: number;
}

interface InvoiceFormData {
  customerId: string;
  orderId: string;
  invoiceDate: string;
  dueDate: string;
  paymentTerms: string;
  notes: string;
  items: InvoiceItemRow[];
}

const INITIAL_FORM_DATA: InvoiceFormData = {
  customerId: '',
  orderId: '',
  invoiceDate: new Date().toISOString().split('T')[0],
  dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
  paymentTerms: '100% Against Proforma / 15 Days from Invoice',
  notes: 'Tax Invoice for Supply & Installation of Pacific Restroom Cubicle System.',
  items: [
    {
      serialNumber: 1,
      description: 'Pacific 12mm Compact Laminate Restroom Cubicles (Standard)',
      hsnSac: '9403',
      quantity: 1,
      rate: 25000,
      amount: 25000,
      gstRate: 18,
    },
  ],
};

export default function CreateInvoicePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedOrderId = searchParams.get('orderId') || '';

  const [lastSavedTime, setLastSavedTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customers, setCustomers] = useState<BusinessParty[]>([]);
  const [orders, setOrders] = useState<SalesOrder[]>([]);

  const [formData, setFormData] = useState<InvoiceFormData>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) return { ...INITIAL_FORM_DATA, ...JSON.parse(cached) };
    } catch {}
    return INITIAL_FORM_DATA;
  });

  // Load lookup lists
  const loadLookups = useCallback(async () => {
    try {
      const [custRes, orderRes] = await Promise.all([
        crmApi.listCustomers({ limit: 100 }),
        salesOrdersApi.list({ limit: 100 }),
      ]);
      if (custRes.data?.data?.items) setCustomers(custRes.data.data.items);
      if (orderRes.data?.data?.items) setOrders(orderRes.data.data.items);
    } catch (err) {
      console.error('Failed to load customers/orders for invoice:', err);
    }
  }, []);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  // Handle URL preselection of order
  useEffect(() => {
    if (preselectedOrderId && orders.length > 0) {
      const ord = orders.find((o) => o.id === preselectedOrderId);
      if (ord) {
        handleOrderSelect(ord.id);
      }
    }
  }, [preselectedOrderId, orders]);

  // Auto-save draft
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(formData));
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch {}
  }, [formData]);

  const handleReset = () => {
    if (window.confirm('Reset this draft? All inputs will be cleared.')) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setFormData(INITIAL_FORM_DATA);
    }
  };

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === formData.customerId),
    [customers, formData.customerId]
  );

  const billingAddr = useMemo(
    () =>
      selectedCustomer?.addresses?.find((a: any) => a.addressType === 'BILLING' || a.isDefaultBilling) ||
      selectedCustomer?.addresses?.[0],
    [selectedCustomer]
  );

  const deliveryAddr = useMemo(
    () =>
      selectedCustomer?.addresses?.find((a: any) => a.addressType === 'SHIPPING' || a.isDefaultShipping),
    [selectedCustomer]
  );

  const handleCustomerChange = (cId: string) => {
    setFormData((prev) => ({
      ...prev,
      customerId: cId,
      orderId: '', // Reset order when customer changes
    }));
  };

  const handleOrderSelect = (ordId: string) => {
    const ord = orders.find((o) => o.id === ordId);
    if (!ord) {
      setFormData((prev) => ({ ...prev, orderId: ordId }));
      return;
    }

    // Auto populate items from order if available
    let orderItems: InvoiceItemRow[] = [];
    if (ord.items && ord.items.length > 0) {
      orderItems = ord.items.map((it: any, idx: number) => ({
        serialNumber: idx + 1,
        description: it.description || it.itemDescription || 'Restroom Cubicle Component',
        hsnSac: it.hsnSac || '9403',
        quantity: Number(it.quantity) || 1,
        rate: Number(it.rate || it.unitPrice || 0),
        amount: (Number(it.quantity) || 1) * Number(it.rate || it.unitPrice || 0),
        gstRate: Number(it.gstRate || 18),
      }));
    }

    // Auto-append Installation Charges with per-cubicle rate breakdown if present on order
    if (ord.installationCharge && Number(ord.installationCharge) > 0) {
      const installAmt = Number(ord.installationCharge);
      const detectedCountFromItems = ord.items
        ? ord.items.filter(isRestroomCubicleItem).reduce((sum: number, it: any) => sum + (Number(it.quantity) || 0), 0)
        : 0;
      const installCount = Number(ord.installationCubicleCount) || (detectedCountFromItems > 0 ? detectedCountFromItems : 1);
      const installRate = Number(ord.installationRatePerCubicle) || (installCount > 0 ? Math.round(installAmt / installCount) : installAmt);
      orderItems.push({
        serialNumber: orderItems.length + 1,
        description: `Supply & Erection / Installation Charges for Restroom Cubicles (@ ₹ ${installRate.toLocaleString('en-IN')}/Cubicle for ${installCount} Cubicle${installCount === 1 ? '' : 's'})`,
        hsnSac: '995469',
        quantity: installCount,
        rate: installRate,
        amount: installAmt,
        gstRate: 18,
      });
    }

    // Auto-append Freight & Transportation if present on order
    if (ord.freightAmount && Number(ord.freightAmount) > 0) {
      const freightAmt = Number(ord.freightAmount);
      orderItems.push({
        serialNumber: orderItems.length + 1,
        description: `Freight & Handling / Transportation Charges to Site`,
        hsnSac: '996511',
        quantity: 1,
        rate: freightAmt,
        amount: freightAmt,
        gstRate: 18,
      });
    }

    setFormData((prev) => ({
      ...prev,
      orderId: ordId,
      customerId: ord.customerId || prev.customerId,
      items: orderItems.length > 0 ? orderItems : prev.items,
      notes: `Tax invoice generated from Sales Order ${ord.orderNumber}.`,
    }));
  };

  const handleItemChange = (index: number, field: keyof InvoiceItemRow, value: any) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      const cur = { ...newItems[index], [field]: value };
      if (field === 'quantity' || field === 'rate') {
        cur.amount = Number(cur.quantity || 0) * Number(cur.rate || 0);
      }
      newItems[index] = cur;
      return { ...prev, items: newItems };
    });
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          serialNumber: prev.items.length + 1,
          description: '',
          hsnSac: '9403',
          quantity: 1,
          rate: 0,
          amount: 0,
          gstRate: 18,
        },
      ],
    }));
  };

  const handleAddInstallationLine = () => {
    // Count cubicles STRICTLY from cubicle items in the current invoice
    const detectedCubicles = formData.items
      .filter(isRestroomCubicleItem)
      .reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
    const cubicleCount = detectedCubicles > 0 ? detectedCubicles : 1;
    const rate = 1000;
    const amount = cubicleCount * rate;

    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          serialNumber: prev.items.length + 1,
          description: `Supply & Erection / Installation Charges for Restroom Cubicles (@ ₹ ${rate.toLocaleString('en-IN')}/Cubicle for ${cubicleCount} Cubicle${cubicleCount === 1 ? '' : 's'})`,
          hsnSac: '995469',
          quantity: cubicleCount,
          rate: rate,
          amount: amount,
          gstRate: 18,
        },
      ],
    }));
  };

  const removeItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index).map((it, idx) => ({ ...it, serialNumber: idx + 1 })),
    }));
  };

  // Subtotal & GST Calculation
  const subtotal = useMemo(
    () => formData.items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.rate) || 0), 0),
    [formData.items]
  );

  const gstBreakdown = useMemo(() => {
    const addressStr = deliveryAddr
      ? [deliveryAddr.addressLine1, deliveryAddr.city, deliveryAddr.state].filter(Boolean).join(', ')
      : billingAddr
      ? [billingAddr.addressLine1, billingAddr.city, billingAddr.state].filter(Boolean).join(', ')
      : '';

    return calculateGstSplit(
      subtotal,
      billingAddr?.stateCode || deliveryAddr?.stateCode,
      billingAddr?.state || deliveryAddr?.state,
      false,
      18,
      selectedCustomer?.gstin,
      addressStr
    );
  }, [subtotal, billingAddr, deliveryAddr, selectedCustomer]);

  const handleSubmit = async () => {
    try {
      if (!formData.customerId && !formData.orderId) {
        alert('Please select a customer or sales order.');
        return;
      }
      setIsSubmitting(true);

      const payload = {
        orderId: formData.orderId || undefined,
        customerId: formData.customerId || undefined,
        subtotal: subtotal,
        taxAmount: gstBreakdown.totalTax,
        totalAmount: gstBreakdown.grandTotal,
        currency: 'INR',
        notes: formData.notes,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
        issueDate: formData.invoiceDate ? new Date(formData.invoiceDate).toISOString() : new Date().toISOString(),
        status: 'DRAFT',
      };

      await invoicesApi.create(payload);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      alert('Tax Invoice created successfully!');
      navigate('/admin/dashboard/invoices');
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to create invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter orders for the selected customer
  const filteredOrders = useMemo(() => {
    if (!formData.customerId) return orders;
    return orders.filter((o) => o.customerId === formData.customerId);
  }, [orders, formData.customerId]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#121226] border border-white/5 p-4 sm:p-6 rounded-2xl">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/dashboard/invoices"
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition flex items-center justify-center min-h-[44px] min-w-[44px]"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white">Create GST Tax Invoice</h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#7FB706]/10 text-[#7FB706] border border-[#7FB706]/20">
                Stage 04 Bill
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
              Statutory GST tax bill with automatic 07 Delhi CGST+SGST split & delivery address mapping
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs">
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Saved in Local Storage</span>
            {lastSavedTime && <span className="text-[11px] opacity-80">({lastSavedTime})</span>}
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 min-h-[40px] transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Draft</span>
          </button>
        </div>
      </div>

      {/* ── Document Flow Timeline (Stage 04) ───────────────────── */}
      <DocumentFlowTimeline currentStage={4} />

      {/* Form Container */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 sm:p-6 space-y-6">
        {/* Section 1: Customer & Sales Order References */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Customer / Consignee <span className="text-red-400">*</span>
            </label>
            <select
              value={formData.customerId}
              onChange={(e) => handleCustomerChange(e.target.value)}
              className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706] w-full min-h-[44px]"
            >
              <option value="">-- Select Customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.legalName || c.tradeName} {c.gstin ? `(${c.gstin})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Linked Sales Order (Optional)
            </label>
            <select
              value={formData.orderId}
              onChange={(e) => handleOrderSelect(e.target.value)}
              className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706] w-full min-h-[44px]"
            >
              <option value="">-- Direct Invoice / None --</option>
              {filteredOrders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.orderNumber} {o.clientPoNumber ? `(PO: ${o.clientPoNumber})` : ''} - ₹
                  {Number(o.grandTotal || 0).toLocaleString('en-IN')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Invoice Date</label>
            <input
              type="date"
              name="invoiceDate"
              value={formData.invoiceDate}
              onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
              className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706] w-full min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Payment Due Date</label>
            <input
              type="date"
              name="dueDate"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706] w-full min-h-[44px]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Payment Terms</label>
            <input
              type="text"
              name="paymentTerms"
              value={formData.paymentTerms}
              onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
              placeholder="e.g. 50% Advance, 50% Before Dispatch / 15 Days from Invoice"
              className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] w-full min-h-[44px]"
            />
          </div>
        </div>

        {/* Section 2: Addresses Snapshot (Billing & Delivery) */}
        {selectedCustomer && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-[#0a0a1a] border border-white/10">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-300 uppercase tracking-wider">
                <Building2 className="w-3.5 h-3.5 text-[#7FB706]" /> Primary Billing Address
              </div>
              {billingAddr ? (
                <div className="text-xs text-gray-400 space-y-0.5">
                  <p className="text-white font-medium">{billingAddr.addressLine1}</p>
                  {billingAddr.addressLine2 && <p>{billingAddr.addressLine2}</p>}
                  <p>
                    {billingAddr.city}, {billingAddr.state} - {billingAddr.postalCode}
                  </p>
                  <p className="font-mono text-gray-500">State Code: {billingAddr.stateCode || '07'}</p>
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">No primary billing address recorded</p>
              )}
            </div>

            <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-white/10 pt-3 sm:pt-0 sm:pl-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Delivery / Site Shipping Address
              </div>
              {deliveryAddr ? (
                <div className="text-xs text-gray-400 space-y-0.5">
                  <p className="text-white font-medium">{deliveryAddr.addressLine1}</p>
                  {deliveryAddr.addressLine2 && <p>{deliveryAddr.addressLine2}</p>}
                  <p>
                    {deliveryAddr.city}, {deliveryAddr.state} - {deliveryAddr.postalCode}
                  </p>
                  <p className="font-mono text-gray-500">State Code: {deliveryAddr.stateCode || '07'}</p>
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">
                  Same as billing address or not specified (will deliver to billing destination)
                </p>
              )}
            </div>
          </div>
        )}

        {/* Section 3: Invoice Items Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#7FB706]" /> Invoice Items & Goods Description
            </h3>
            <span className="text-xs text-gray-400">{formData.items.length} Line Item(s)</span>
          </div>

          {formData.items.map((item, index) => (
            <div key={index} className="p-4 bg-[#0a0a1a] border border-white/10 rounded-xl space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono font-bold text-[#7FB706]">Item #{item.serialNumber}</span>
                {formData.items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="text-xs text-red-400 p-1 flex items-center gap-1 hover:text-red-300"
                  >
                    <Trash2 className="w-3 h-3" /> Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-3">
                  <label className="block text-[10px] text-gray-400 mb-1">Description of Goods</label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    placeholder="e.g. 12mm Compact Laminate Restroom Cubicle System"
                    className="bg-[#121226] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] w-full min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">HSN / SAC</label>
                  <input
                    type="text"
                    value={item.hsnSac}
                    onChange={(e) => handleItemChange(index, 'hsnSac', e.target.value)}
                    placeholder="9403"
                    className="bg-[#121226] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7FB706] w-full min-h-[44px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                    className="bg-[#121226] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7FB706] w-full min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">Rate (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={item.rate}
                    onChange={(e) => handleItemChange(index, 'rate', Number(e.target.value))}
                    className="bg-[#121226] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7FB706] w-full min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">Amount (Taxable)</label>
                  <div className="bg-[#121226]/60 border border-white/5 rounded-xl px-3 py-2.5 text-sm text-gray-300 font-mono">
                    ₹{(Number(item.quantity || 0) * Number(item.rate || 0)).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">GST Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={item.gstRate}
                    onChange={(e) => handleItemChange(index, 'gstRate', Number(e.target.value))}
                    className="bg-[#121226] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7FB706] w-full min-h-[44px]"
                  />
                </div>
              </div>
            </div>
          ))}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={addItem}
              className="py-3 border-2 border-dashed border-white/10 hover:border-[#7FB706]/40 text-gray-400 hover:text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 min-h-[44px] transition cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Item Line
            </button>
            <button
              type="button"
              onClick={handleAddInstallationLine}
              className="py-3 border border-emerald-500/30 hover:border-emerald-500/60 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 min-h-[44px] transition cursor-pointer"
              title="Add a formal SAC 995469 cubicle installation line item"
            >
              <Wrench className="w-4 h-4 text-[#7FB706]" /> + Add Installation Line Item (@ ₹ 1,000/Cubicle)
            </button>
          </div>
        </div>

        {/* Section 4: Delhi 07 GST Breakdown Dock */}
        <div className="bg-[#0a0a1a] border border-white/10 rounded-xl p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Statutory Tax Determination
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    gstBreakdown.isDelhi
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                  }`}
                >
                  {gstBreakdown.isDelhi
                    ? '📍 Delhi Supply (Intra-state: CGST 9% + SGST 9%)'
                    : '🌐 Inter-State Supply (IGST 18%)'}
                </span>
              </div>
              <p className="text-[11px] text-gray-500">
                Place of Supply:{' '}
                <strong className="text-gray-300">
                  {billingAddr?.state || deliveryAddr?.state || 'Delhi (07)'}
                </strong>
              </p>
            </div>

            <div className="w-full sm:w-72 space-y-2 text-right">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Taxable Subtotal:</span>
                <span className="font-mono text-white">
                  ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              {gstBreakdown.isDelhi ? (
                <>
                  <div className="flex justify-between text-xs text-blue-400">
                    <span>CGST (9%):</span>
                    <span className="font-mono">
                      ₹{gstBreakdown.cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-blue-400">
                    <span>SGST (9%):</span>
                    <span className="font-mono">
                      ₹{gstBreakdown.sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-xs text-purple-400">
                  <span>IGST (18%):</span>
                  <span className="font-mono">
                    ₹{gstBreakdown.igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-white/10">
                <span>Total Invoice Value:</span>
                <span className="font-mono text-[#7FB706]">
                  ₹{gstBreakdown.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Notes & Terms */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-gray-300">Terms, Conditions & Notes</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] w-full h-24"
          />
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-end gap-3">
          <Link
            to="/admin/dashboard/invoices"
            className="w-full sm:w-auto px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl min-h-[48px] flex items-center justify-center gap-2 transition"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-6 py-3 bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold rounded-xl shadow-lg shadow-[#7FB706]/20 min-h-[48px] flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            <CheckCircle2 className="w-5 h-5" />
            {isSubmitting ? 'Saving...' : 'Save & Issue Tax Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}
