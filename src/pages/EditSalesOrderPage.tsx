import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ShoppingBag,
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  RefreshCw,
  Building2,
  Truck,
  Layers,
  FileText,
  Sparkles,
  CheckCircle2,
  DollarSign,
  HelpCircle,
  MapPin,
  Wrench,
  Copy,
  AlertTriangle,
} from 'lucide-react';
import { salesOrdersApi } from '../api/salesOrdersApi';
import { crmApi } from '../api/crmApi';
import { productCatalogApi } from '../api/productCatalogApi';
import {
  getMergedQuotationModels,
  formatModelHardwareInclusions,
  extractModelDimensions,
} from '../utils/quotationProductPresets';
import DocumentFlowTimeline from '../components/common/DocumentFlowTimeline';
import CustomerSearchSelect from '../components/common/CustomerSearchSelect';
import type { BusinessParty, ProductCatalogModel, SalesOrder } from '../types/admin';
import { calculateGstSplit, isDelhiState, GST_STATE_CODE_MAP, isRestroomCubicleItem } from '../utils/tax';
import {
  DEFAULT_ACCESSORIES_TEXT,
  type CreateItem,
  type BillingAddressData,
  type DeliveryAddressData,
} from './CreateProformaPage';

function parseItemSpecsFromText(desc: string) {
  const specs: Record<string, string> = {};
  if (!desc) return specs;
  const match = desc.match(/\((.*?)\)/s);
  if (match) {
    const parts = match[1].split('|').map((s) => s.trim());
    for (const part of parts) {
      const c = part.indexOf(':');
      if (c > -1) {
        const k = part.substring(0, c).trim().toLowerCase();
        const v = part.substring(c + 1).trim();
        if (k.includes('board') || k.includes('type')) specs.boardType = v;
        if (k.includes('thick')) specs.boardThickness = v;
        if (k.includes('color')) specs.boardColor = v;
        if (k.includes('cubicle') || k.includes('size')) specs.cubicleSize = v;
        if (k.includes('door')) specs.doorSize = v;
        if (k.includes('height')) specs.overallHeight = v;
        if (k.includes('hardware')) specs.hardwarePackage = v;
      }
    }
  }
  return specs;
}

export default function EditSalesOrderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lookups
  const [customers, setCustomers] = useState<BusinessParty[]>([]);
  const [catalogModels, setCatalogModels] = useState<ProductCatalogModel[]>([]);

  // Metadata
  const [orderNumber, setOrderNumber] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [status, setStatus] = useState('APPROVED');
  const [customerId, setCustomerId] = useState('');
  const [clientPoNumber, setClientPoNumber] = useState('');
  const [clientPoDate, setClientPoDate] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('Delhi');
  const [placeOfSupplyStateCode, setPlaceOfSupplyStateCode] = useState('07');
  const [freightAmount, setFreightAmount] = useState<number>(0);
  const [installationCharge, setInstallationCharge] = useState<number>(0);
  const [installationRatePerCubicle, setInstallationRatePerCubicle] = useState<number>(1000);
  const [installationCubicleCount, setInstallationCubicleCount] = useState<number>(0);
  const [quotationId, setQuotationId] = useState<string | undefined>(undefined);
  const [quotationRef, setQuotationRef] = useState<string | undefined>(undefined);
  const [piNumber, setPiNumber] = useState<string | undefined>(undefined);

  // Hardware & Inclusions
  const [selectedHardwarePreset, setSelectedHardwarePreset] = useState<string>('SS_304');
  const [accessoriesText, setAccessoriesText] = useState<string>(DEFAULT_ACCESSORIES_TEXT);

  // Addresses
  const [billingAddress, setBillingAddress] = useState<BillingAddressData>({
    partyName: '',
    gstin: '',
    pan: '',
    addressLine: '',
    city: 'New Delhi',
    pincode: '',
    state: 'Delhi',
    stateCode: '07',
    phone: '',
    email: '',
  });

  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddressData>({
    partyName: '',
    addressLine: '',
    city: 'New Delhi',
    pincode: '',
    state: 'Delhi',
    stateCode: '07',
    phone: '',
  });

  // Items & Terms
  const [items, setItems] = useState<CreateItem[]>([]);
  const [terms, setTerms] = useState<string[]>([]);
  const [newTermText, setNewTermText] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const cubicleModels = useMemo(
    () => catalogModels.filter((m) => m.category === 'Cubicle'),
    [catalogModels]
  );
  const lockerModels = useMemo(
    () => catalogModels.filter((m) => m.category === 'Lockers'),
    [catalogModels]
  );
  const urinalModels = useMemo(
    () => catalogModels.filter((m) => m.category === 'Urinal Partitions'),
    [catalogModels]
  );

  // Load Order and lookups
  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [orderRes, custRes, modelsList] = await Promise.all([
        salesOrdersApi.getById(id),
        crmApi.listCustomers({ limit: 100 }).catch(() => ({ data: { data: { items: [] } } })),
        productCatalogApi.listModels().catch(() => []),
      ]);

      const data: SalesOrder = (orderRes.data?.data ?? orderRes.data) as any;
      setCustomers(custRes.data?.data?.items || []);
      setCatalogModels(getMergedQuotationModels(modelsList || []));

      setOrderNumber(data.orderNumber || '');
      setOrderDate(data.orderDate ? new Date(data.orderDate).toISOString().split('T')[0] : '');
      setStatus(data.status || 'APPROVED');
      setCustomerId(data.customerId || '');
      setClientPoNumber(data.customerPoNumber || data.clientPoNumber || '');
      setClientPoDate(
        data.customerPoDate
          ? new Date(data.customerPoDate).toISOString().split('T')[0]
          : data.clientPoDate
          ? new Date(data.clientPoDate).toISOString().split('T')[0]
          : ''
      );
      setPlaceOfSupply(data.placeOfSupply || 'Delhi');
      setPlaceOfSupplyStateCode(data.placeOfSupplyStateCode || '07');
      setFreightAmount(Number(data.freightAmount) || 0);
      setInstallationCharge(Number(data.installationCharge) || 0);
      setInstallationRatePerCubicle(data.installationRatePerCubicle || (Number(data.installationCharge) > 0 ? Math.round(Number(data.installationCharge) / (data.installationCubicleCount || 1)) : 1000));
      setInstallationCubicleCount(data.installationCubicleCount || 0);
      setQuotationId(data.quotationId || undefined);
      setQuotationRef(data.quotationRef || undefined);
      setPiNumber(data.piNumber || undefined);

      if (data.accessoriesText) {
        setAccessoriesText(data.accessoriesText);
      }

      // Billing Address Snapshot
      const bSnap = (data.billingAddressSnapshot as any) || {};
      const cust = data.customer || custRes.data?.data?.items?.find((c: any) => c.id === data.customerId);
      const custBillingAddr = cust?.addresses?.find((a: any) => a.addressType === 'BILLING' || a.isDefaultBilling) || cust?.addresses?.[0];

      setBillingAddress({
        partyName: bSnap.partyName || cust?.legalName || '',
        gstin: bSnap.gstin || cust?.gstin || '',
        pan: bSnap.pan || cust?.pan || (cust?.gstin && cust.gstin.length === 15 ? cust.gstin.substring(2, 12) : ''),
        addressLine: bSnap.address || bSnap.addressLine || custBillingAddr?.addressLine1 || '',
        city: bSnap.city || custBillingAddr?.city || 'New Delhi',
        pincode: bSnap.pincode || bSnap.postalCode || custBillingAddr?.postalCode || '',
        state: bSnap.state || custBillingAddr?.state || 'Delhi',
        stateCode: bSnap.stateCode || custBillingAddr?.stateCode || '07',
        phone: bSnap.phone || cust?.phone || '',
        email: bSnap.email || cust?.email || '',
      });

      // Shipping Address Snapshot
      const sSnap = (data.shippingAddressSnapshot as any) || {};
      const custShipAddr = cust?.addresses?.find((a: any) => a.addressType === 'SHIPPING' || a.isDefaultShipping) || custBillingAddr;

      setDeliveryAddress({
        partyName: sSnap.partyName || sSnap.recipient || sSnap.siteName || cust?.legalName || '',
        addressLine: sSnap.address || sSnap.addressLine || sSnap.siteAddress || custShipAddr?.addressLine1 || '',
        city: sSnap.city || custShipAddr?.city || 'New Delhi',
        pincode: sSnap.pincode || sSnap.postalCode || custShipAddr?.postalCode || '',
        state: sSnap.state || custShipAddr?.state || 'Delhi',
        stateCode: sSnap.stateCode || custShipAddr?.stateCode || '07',
        phone: sSnap.phone || cust?.phone || '',
      });

      // Line items with 7 technical specs
      if (data.items && Array.isArray(data.items) && data.items.length > 0) {
        setItems(
          data.items.map((it: any, idx: number) => {
            const fb = parseItemSpecsFromText(it.description || it.itemDescription || '');
            const specs = it.specsJson || {};
            return {
              id: it.id || `item-${idx}`,
              description: it.description || it.itemDescription || 'Pacific Restroom Cubicle',
              hsnSac: it.hsnSac || '940320',
              quantity: Number(it.quantity) || 1,
              unit: it.unit || 'NOS',
              rate: Number(it.rate || it.unitPrice || 0),
              gstRate: Number(it.gstRate || 18),
              boardType: it.boardType || specs.boardType || fb.boardType || '12mm Compact Laminate HPL Board',
              boardThickness: it.boardThickness || specs.boardThickness || fb.boardThickness || '12mm (Tolerance +/- 0.3mm)',
              boardColor: it.boardColor || specs.boardColor || fb.boardColor || 'Solid / Woodgrain Finish',
              cubicleSize: it.cubicleSize || specs.cubicleSize || fb.cubicleSize || '1000mm (W) x 1200mm (D) x 1980mm (H)',
              doorSize: it.doorSize || specs.doorSize || fb.doorSize || '600mm x 1800mm',
              overallHeight: it.overallHeight || specs.overallHeight || fb.overallHeight || '1980mm including 100mm-150mm ground gap',
              hardwarePackage: it.hardwarePackage || specs.hardwarePackage || fb.hardwarePackage || 'SS 304 Stainless Steel (Satin/Brushed)',
            };
          })
        );
      } else {
        setItems([
          {
            id: 'item-0',
            description: 'Pacific Classique Restroom Cubicle System',
            hsnSac: '940320',
            quantity: 1,
            unit: 'NOS',
            rate: 22000,
            gstRate: 18,
            boardType: '12mm Compact Laminate HPL Board',
            boardThickness: '12mm (Tolerance +/- 0.3mm)',
            boardColor: 'Solid / Woodgrain Finish',
            cubicleSize: '1000mm (W) x 1200mm (D) x 1980mm (H)',
            doorSize: '600mm x 1800mm',
            overallHeight: '1980mm including 100mm-150mm ground gap',
            hardwarePackage: 'SS 304 Stainless Steel (Satin/Brushed)',
          },
        ]);
      }

      // Terms
      if (data.termsJson && Array.isArray(data.termsJson) && data.termsJson.length > 0) {
        setTerms(data.termsJson.map((t: any) => (typeof t === 'string' ? t : t.text || String(t))));
      } else {
        setTerms([
          'Goods once dispatched will not be taken back or exchanged.',
          'Interest @ 18% per annum will be charged if payment is delayed beyond agreed terms.',
          'Pacific is not responsible for transit damage after handover to carrier.',
          'Site readiness, civil unloading, and electricity for installation to be provided by client.',
          'Subject to Delhi jurisdiction only.',
        ]);
      }
    } catch (err: any) {
      console.error('Failed to load Sales Order data:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load Sales Order');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Customer change auto-fill
  const handleCustomerSelect = (cId: string) => {
    setCustomerId(cId);
    const cust = customers.find((c) => c.id === cId);
    if (!cust) return;

    const bAddr = cust.addresses?.find((a: any) => a.addressType === 'BILLING' || a.isDefaultBilling) || cust.addresses?.[0];
    const sAddr = cust.addresses?.find((a: any) => a.addressType === 'SHIPPING' || a.isDefaultShipping) || bAddr;

    setBillingAddress({
      partyName: cust.legalName || cust.tradeName || '',
      gstin: cust.gstin || '',
      pan: cust.pan || (cust.gstin && cust.gstin.length === 15 ? cust.gstin.substring(2, 12) : ''),
      addressLine: bAddr?.addressLine1 || '',
      city: bAddr?.city || 'New Delhi',
      pincode: bAddr?.postalCode || '',
      state: bAddr?.state || 'Delhi',
      stateCode: bAddr?.stateCode || '07',
      phone: cust.phone || '',
      email: cust.email || '',
    });

    setDeliveryAddress({
      partyName: cust.tradeName || cust.legalName || '',
      addressLine: sAddr?.addressLine1 || '',
      city: sAddr?.city || 'New Delhi',
      pincode: sAddr?.postalCode || '',
      state: sAddr?.state || 'Delhi',
      stateCode: sAddr?.stateCode || '07',
      phone: cust.phone || '',
    });

    if (bAddr?.state) {
      setPlaceOfSupply(bAddr.state);
      setPlaceOfSupplyStateCode(bAddr.stateCode || '07');
    }
  };

  // Model Preset Selection for an Item (matching Quotation item selection)
  const handleSelectModel = (idx: number, modelId: string) => {
    if (!modelId) {
      handleItemChange(idx, 'modelId', '');
      return;
    }

    const selected = catalogModels.find((m) => m.id === modelId || m.slug === modelId);
    if (!selected) return;

    const dims = extractModelDimensions(selected);
    const hwText = formatModelHardwareInclusions(selected);

    setItems((prev) => {
      const nextItems = [...prev];
      nextItems[idx] = {
        ...nextItems[idx],
        modelId: selected.id,
        description: `Pacific ${selected.title} (${selected.category})`,
        cubicleSize: dims.cubicleSize,
        doorSize: dims.doorSize,
        overallHeight: dims.overallHeight,
        boardThickness: dims.boardThickness,
        boardType: dims.boardType,
        hardwarePackage: dims.hardwarePackage,
      };
      return nextItems;
    });

    // Auto-fetch and replace Standard Inclusions & Hardware Accessories
    setAccessoriesText(hwText);
  };

  // Item row operations
  const handleItemChange = (idx: number, field: keyof CreateItem, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        description: 'Pacific Restroom Cubicle System',
        hsnSac: '940320',
        quantity: 1,
        unit: 'NOS',
        rate: 20000,
        gstRate: 18,
        boardType: '12mm Compact Laminate HPL Board',
        boardThickness: '12mm (Tolerance +/- 0.3mm)',
        boardColor: 'Solid / Woodgrain Finish',
        cubicleSize: '1000mm (W) x 1200mm (D) x 1980mm (H)',
        doorSize: '600mm x 1800mm',
        overallHeight: '1980mm including 100mm-150mm ground gap',
        hardwarePackage: 'SS 304 Stainless Steel (Satin/Brushed)',
      },
    ]);
  };

  const handleDuplicateItem = (idx: number) => {
    setItems((prev) => {
      const copy = { ...prev[idx], id: `item-${Date.now()}` };
      const updated = [...prev];
      updated.splice(idx + 1, 0, copy);
      return updated;
    });
  };

  const handleRemoveItem = (idx: number) => {
    if (items.length <= 1) {
      alert('Order must contain at least one line item.');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // Term operations
  const handleAddTerm = () => {
    if (!newTermText.trim()) return;
    setTerms((prev) => [...prev, newTermText.trim()]);
    setNewTermText('');
  };

  const handleRemoveTerm = (tIdx: number) => {
    setTerms((prev) => prev.filter((_, i) => i !== tIdx));
  };

  const handleAddInstallationItem = () => {
    const count = effectiveCubicleCount > 0 ? effectiveCubicleCount : 1;
    const rate = effectiveInstallRate;
    setItems((prev) => [
      ...prev,
      {
        description: `Supply & Erection / Installation Charges for Restroom Cubicles (@ ₹ ${rate.toLocaleString('en-IN')}/Cubicle for ${count} Cubicle${count === 1 ? '' : 's'})`,
        hsnSac: '995469',
        unit: 'CUBICLE',
        quantity: count,
        rate: rate,
        gstRate: 18,
      },
    ]);
  };

  // GST & Totals
  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.rate) || 0), 0),
    [items]
  );

  const detectedCubicleCount = useMemo(() => {
    return items
      .filter(isRestroomCubicleItem)
      .reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  }, [items]);

  const effectiveCubicleCount = installationCubicleCount !== undefined && installationCubicleCount > 0
    ? installationCubicleCount
    : detectedCubicleCount;
  const effectiveInstallRate = installationRatePerCubicle ?? (effectiveCubicleCount > 0 && installationCharge ? Math.round(Number(installationCharge) / effectiveCubicleCount) : 1000);

  const taxableTotal = subtotal + Number(freightAmount || 0) + Number(installationCharge || 0);

  const gstBreakdown = useMemo(() => {
    return calculateGstSplit(
      taxableTotal,
      placeOfSupplyStateCode || billingAddress.stateCode,
      placeOfSupply || billingAddress.state,
      false,
      18,
      billingAddress.gstin,
      billingAddress.addressLine
    );
  }, [taxableTotal, placeOfSupplyStateCode, placeOfSupply, billingAddress]);

  const grandTotal = Math.round(taxableTotal + gstBreakdown.totalTax);

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    const errors: Record<string, string> = {};
    if (!customerId) errors.customerId = 'Please select a customer';
    if (!billingAddress.partyName) errors.billingParty = 'Billing party name is required';
    if (!billingAddress.addressLine) errors.billingAddress = 'Billing address line is required';
    if (items.length === 0) errors.items = 'At least one line item is required';

    items.forEach((it, idx) => {
      if (!it.description?.trim()) errors[`item_${idx}_desc`] = 'Description required';
      if ((Number(it.quantity) || 0) <= 0) errors[`item_${idx}_qty`] = 'Quantity must be > 0';
      if ((Number(it.rate) || 0) <= 0) errors[`item_${idx}_rate`] = 'Rate must be > 0';
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      alert('Please correct the validation errors before saving.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        orderDate: orderDate ? new Date(orderDate).toISOString() : new Date().toISOString(),
        customerId,
        customerPoNumber: clientPoNumber || null,
        customerPoDate: clientPoDate ? new Date(clientPoDate).toISOString() : null,
        placeOfSupply,
        placeOfSupplyStateCode,
        freightAmount: Number(freightAmount) || 0,
        installationCharge: Number(installationCharge) || 0,
        installationRatePerCubicle: Number(installationCharge) > 0 ? (installationRatePerCubicle ?? 1000) : undefined,
        installationCubicleCount: Number(installationCharge) > 0 ? (installationCubicleCount || detectedCubicleCount || undefined) : undefined,
        taxRate: 18,
        accessoriesText,
        terms,
        billingAddressSnapshot: {
          partyName: billingAddress.partyName,
          gstin: billingAddress.gstin,
          pan: billingAddress.pan,
          address: billingAddress.addressLine,
          city: billingAddress.city,
          pincode: billingAddress.pincode,
          state: billingAddress.state,
          stateCode: billingAddress.stateCode,
          phone: billingAddress.phone,
          email: billingAddress.email,
        },
        shippingAddressSnapshot: {
          partyName: deliveryAddress.partyName || billingAddress.partyName,
          recipient: deliveryAddress.partyName || billingAddress.partyName,
          address: deliveryAddress.addressLine,
          city: deliveryAddress.city,
          pincode: deliveryAddress.pincode,
          state: deliveryAddress.state,
          stateCode: deliveryAddress.stateCode,
          phone: deliveryAddress.phone,
        },
        items: items.map((it) => ({
          description: it.description,
          hsnSac: it.hsnSac || '940320',
          quantity: Number(it.quantity) || 1,
          unit: it.unit || 'NOS',
          rate: Number(it.rate) || 0,
          boardType: it.boardType || null,
          boardThickness: it.boardThickness || null,
          boardColor: it.boardColor || null,
          cubicleSize: it.cubicleSize || null,
          doorSize: it.doorSize || null,
          overallHeight: it.overallHeight || null,
          hardwarePackage: it.hardwarePackage || null,
          specsJson: {
            boardType: it.boardType,
            boardThickness: it.boardThickness,
            boardColor: it.boardColor,
            cubicleSize: it.cubicleSize,
            doorSize: it.doorSize,
            overallHeight: it.overallHeight,
            hardwarePackage: it.hardwarePackage,
          },
        })),
      };

      await salesOrdersApi.update(id, payload);
      alert('Sales Order updated successfully!');
      navigate(`/admin/dashboard/sales-orders/${id}`);
    } catch (err: any) {
      console.error('Failed to update Sales Order:', err);
      alert(err.response?.data?.message || err.message || 'Failed to update Sales Order');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8">
        <div className="w-10 h-10 border-4 border-[#7FB706]/20 border-t-[#7FB706] rounded-full animate-spin mb-4" />
        <p className="text-gray-400 text-sm">Loading Sales Order for editing...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-[#121226] border border-red-500/20 rounded-2xl text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">Error Loading Order</h2>
        <p className="text-sm text-gray-400">{error}</p>
        <Link
          to={`/admin/dashboard/sales-orders/${id}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Order
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-28 max-w-7xl mx-auto">
      {/* ── Top Bar ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#121226] border border-white/5 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/admin/dashboard/sales-orders/${id}`)}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
            title="Back to Order Detail"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-black text-white font-mono flex items-center gap-2">
                <ShoppingBag className="w-6 h-6 text-[#7FB706]" />
                Edit Order: {orderNumber}
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                {status}
              </span>
              {quotationRef && (
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  Quote: {quotationRef}
                </span>
              )}
              {piNumber && (
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  PI: {piNumber}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Modify line items, technical specifications, billing & delivery addresses, and commercial terms.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate(`/admin/dashboard/sales-orders/${id}`)}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-[#030213] font-bold rounded-xl text-xs transition-all shadow-lg shadow-[#7FB706]/20 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {submitting ? 'Saving Order...' : 'Save Sales Order'}
          </button>
        </div>
      </div>

      {/* ── Document Flow Timeline (Stage 3) ───────────────────── */}
      <DocumentFlowTimeline
        currentStage={3}
        documentRef={orderNumber}
        currentStatus={status}
        linkedDocs={{
          quotationId,
          quotationRef,
          orderId: id,
          orderNumber,
          piNumber,
        }}
      />

      {/* ── Customer & Order Reference Metadata Card ───────────── */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-white/5">
          <Building2 className="w-4 h-4 text-[#7FB706]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Order Header & Client Mapping</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Customer Selection */}
          <CustomerSearchSelect
            customers={customers}
            selectedCustomerId={customerId}
            onSelectCustomer={(cId) => handleCustomerSelect(cId)}
            error={fieldErrors.customerId}
            label="Customer Party *"
            placeholder="Search party name, email, GST, phone..."
            required
          />

          {/* Order Date */}
          <div className="space-y-1.5">
            <label className="text-gray-400 font-medium">Order Date</label>
            <input
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-[#7FB706] focus:outline-none"
            />
          </div>

          {/* Client PO Number */}
          <div className="space-y-1.5">
            <label className="text-gray-400 font-medium">Client PO Number</label>
            <input
              type="text"
              placeholder="e.g. PO-2026-8941"
              value={clientPoNumber}
              onChange={(e) => setClientPoNumber(e.target.value)}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-[#7FB706] focus:outline-none font-mono"
            />
          </div>

          {/* Client PO Date */}
          <div className="space-y-1.5">
            <label className="text-gray-400 font-medium">Client PO Date</label>
            <input
              type="date"
              value={clientPoDate}
              onChange={(e) => setClientPoDate(e.target.value)}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-[#7FB706] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* ── Bill To & Ship To 2-Column Grid ────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bill To Card */}
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#7FB706]" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Billing Party (Customer)</h4>
            </div>
            <span className="text-[10px] text-gray-500 font-mono">Invoice Recipient</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div>
              <label className="text-gray-400 block mb-1">Company / Legal Name *</label>
              <input
                type="text"
                value={billingAddress.partyName}
                onChange={(e) => setBillingAddress({ ...billingAddress, partyName: e.target.value })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-[#7FB706] focus:outline-none"
                placeholder="Company Name"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-gray-400 block mb-1">GSTIN (15 chars)</label>
                <input
                  type="text"
                  maxLength={15}
                  value={billingAddress.gstin}
                  onChange={(e) => {
                    const gstin = e.target.value.toUpperCase();
                    const pan = gstin.length >= 12 ? gstin.substring(2, 12) : billingAddress.pan;
                    const stCode = gstin.length >= 2 ? gstin.substring(0, 2) : billingAddress.stateCode;
                    const stName = (stCode ? GST_STATE_CODE_MAP[stCode] : undefined) || (stCode === '07' ? 'Delhi' : billingAddress.state);
                    setBillingAddress({ ...billingAddress, gstin, pan, stateCode: stCode, state: stName });
                    setPlaceOfSupply(stName);
                    setPlaceOfSupplyStateCode(stCode);
                  }}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-amber-300 text-xs font-mono focus:border-[#7FB706] focus:outline-none"
                  placeholder="07AAAAA0000A1Z5"
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1">PAN Number</label>
                <input
                  type="text"
                  maxLength={10}
                  value={billingAddress.pan}
                  onChange={(e) => setBillingAddress({ ...billingAddress, pan: e.target.value.toUpperCase() })}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-[#7FB706] focus:outline-none"
                  placeholder="ABCDE1234F"
                />
              </div>
            </div>

            <div>
              <label className="text-gray-400 block mb-1">Registered Address *</label>
              <textarea
                rows={2}
                value={billingAddress.addressLine}
                onChange={(e) => setBillingAddress({ ...billingAddress, addressLine: e.target.value })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-[#7FB706] focus:outline-none"
                placeholder="Plot / Building, Street, Area"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-gray-400 block mb-1">City</label>
                <input
                  type="text"
                  value={billingAddress.city}
                  onChange={(e) => setBillingAddress({ ...billingAddress, city: e.target.value })}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs"
                />
              </div>
              <div>
                <label className="text-gray-400 block mb-1">State</label>
                <input
                  type="text"
                  value={billingAddress.state}
                  onChange={(e) => {
                    const st = e.target.value;
                    const code = st.toLowerCase().includes('delhi') ? '07' : billingAddress.stateCode;
                    setBillingAddress({ ...billingAddress, state: st, stateCode: code });
                    setPlaceOfSupply(st);
                    setPlaceOfSupplyStateCode(code);
                  }}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs"
                />
              </div>
              <div>
                <label className="text-gray-400 block mb-1">Pincode</label>
                <input
                  type="text"
                  value={billingAddress.pincode}
                  onChange={(e) => setBillingAddress({ ...billingAddress, pincode: e.target.value })}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-mono"
                  placeholder="110001"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-gray-400 block mb-1">Phone</label>
                <input
                  type="text"
                  value={billingAddress.phone}
                  onChange={(e) => setBillingAddress({ ...billingAddress, phone: e.target.value })}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs"
                />
              </div>
              <div>
                <label className="text-gray-400 block mb-1">Email</label>
                <input
                  type="email"
                  value={billingAddress.email}
                  onChange={(e) => setBillingAddress({ ...billingAddress, email: e.target.value })}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Ship To Card */}
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Delivery Site / Shipping Party</h4>
            </div>
            <button
              type="button"
              onClick={() => {
                setDeliveryAddress({
                  partyName: billingAddress.partyName,
                  addressLine: billingAddress.addressLine,
                  city: billingAddress.city,
                  pincode: billingAddress.pincode,
                  state: billingAddress.state,
                  stateCode: billingAddress.stateCode,
                  phone: billingAddress.phone,
                });
              }}
              className="text-[11px] text-[#7FB706] hover:underline flex items-center gap-1 cursor-pointer font-semibold"
            >
              <Copy className="w-3 h-3" /> Same as Billing
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            <div>
              <label className="text-gray-400 block mb-1">Consignee / Site Name *</label>
              <input
                type="text"
                value={deliveryAddress.partyName}
                onChange={(e) => setDeliveryAddress({ ...deliveryAddress, partyName: e.target.value })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-[#7FB706] focus:outline-none"
                placeholder="Consignee or Project Site Name"
              />
            </div>

            <div>
              <label className="text-gray-400 block mb-1">Site Delivery Address *</label>
              <textarea
                rows={2}
                value={deliveryAddress.addressLine}
                onChange={(e) => setDeliveryAddress({ ...deliveryAddress, addressLine: e.target.value })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-[#7FB706] focus:outline-none"
                placeholder="Plot / Project Location, Landmark"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-gray-400 block mb-1">City</label>
                <input
                  type="text"
                  value={deliveryAddress.city}
                  onChange={(e) => setDeliveryAddress({ ...deliveryAddress, city: e.target.value })}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs"
                />
              </div>
              <div>
                <label className="text-gray-400 block mb-1">State</label>
                <input
                  type="text"
                  value={deliveryAddress.state}
                  onChange={(e) => {
                    const st = e.target.value;
                    const code = st.toLowerCase().includes('delhi') ? '07' : deliveryAddress.stateCode;
                    setDeliveryAddress({ ...deliveryAddress, state: st, stateCode: code });
                  }}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs"
                />
              </div>
              <div>
                <label className="text-gray-400 block mb-1">Pincode</label>
                <input
                  type="text"
                  value={deliveryAddress.pincode}
                  onChange={(e) => setDeliveryAddress({ ...deliveryAddress, pincode: e.target.value })}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-mono"
                  placeholder="110001"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-gray-400 block mb-1">Site Contact Phone</label>
                <input
                  type="text"
                  value={deliveryAddress.phone}
                  onChange={(e) => setDeliveryAddress({ ...deliveryAddress, phone: e.target.value })}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs"
                  placeholder="+91-XXXXX-XXXXX"
                />
              </div>
              <div>
                <label className="text-gray-400 block mb-1">Place of Supply (GST)</label>
                <input
                  type="text"
                  value={placeOfSupply}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPlaceOfSupply(val);
                    if (val.toLowerCase().includes('delhi')) setPlaceOfSupplyStateCode('07');
                  }}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-medium"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Hardware Accessories & Standard Inclusions ─────────── */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-white/5">
          <Wrench className="w-4 h-4 text-[#7FB706]" />
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            Standard Inclusions &amp; Hardware Accessories
          </h4>
        </div>

        {/* Editable Standard Inclusions Box */}
        <div>
          <label className="text-gray-400 block mb-1 text-xs">
            Standard Inclusions Specification (Printed on PDF and Work Order):
          </label>
          <textarea
            rows={4}
            value={accessoriesText}
            onChange={(e) => setAccessoriesText(e.target.value)}
            className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-3 text-white text-xs leading-relaxed font-sans focus:border-[#7FB706] focus:outline-none"
          />
        </div>
      </div>


      {/* ── Line Items & Fabrication Specifications ────────────── */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl overflow-hidden shadow-xl space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#7FB706]" />
            <div>
              <h3 className="text-sm font-bold text-white">Line Items & Technical Specifications</h3>
              <p className="text-xs text-gray-400">
                Configure precise board types, dimensions, colors, and hardware packages per line item.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddItem}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#7FB706]/15 hover:bg-[#7FB706]/25 text-[#7FB706] border border-[#7FB706]/30 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Item Row
          </button>
        </div>

        {/* Items List matching Quotation UI */}
        <div className="space-y-4">
          {items.map((item, idx) => (
            <div
              key={item.id || idx}
              className="p-4 rounded-xl bg-[#0a0a1a] border border-white/5 hover:border-white/10 space-y-3 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#7FB706]">Item #{idx + 1}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDuplicateItem(idx)}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                    title="Duplicate Item"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                      title="Remove Item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Product Model Selection & Description */}
              <div className="space-y-1.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="text-xs font-semibold text-gray-300">Product Model Selection &amp; Description *</label>
                  <span className="text-[11px] text-[#7FB706] font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Auto-fetches hardware list, sizes &amp; height
                  </span>
                </div>

                <div>
                  <select
                    value={item.modelId || ''}
                    onChange={(e) => handleSelectModel(idx, e.target.value)}
                    className="w-full bg-[#161536] border border-[#7FB706]/40 rounded-xl px-3 py-2.5 text-white font-semibold text-xs focus:border-[#7FB706] focus:outline-none"
                    required
                  >
                    <option value="">-- Choose Product Model --</option>
                    {cubicleModels.length > 0 && (
                      <optgroup label="Restroom Cubicles (13 Models)">
                        {cubicleModels.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.title}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {lockerModels.length > 0 && (
                      <optgroup label="Modular Lockers (7 Models)">
                        {lockerModels.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.title}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {urinalModels.length > 0 && (
                      <optgroup label="Urinal Partitions (4 Models)">
                        {urinalModels.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.title}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
                {item.description && (
                  <div className="text-[11px] text-gray-400 font-medium px-1 flex items-center gap-1.5">
                    <span className="text-gray-500">Selected Model:</span>
                    <span className="text-white font-semibold">{item.description}</span>
                  </div>
                )}
              </div>

              {/* 3-Column Pricing Row: Unit, Quantity, Rate, Line Total */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white/[0.01] p-3 rounded-lg border border-white/5 text-xs">
                <div>
                  <label className="text-gray-400 block mb-1">Unit</label>
                  <select
                    value={item.unit}
                    onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                    className="w-full bg-[#121226] border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
                  >
                    {['NOS', 'SET', 'SQM', 'MTR', 'RMT', 'LOT'].map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-gray-400 block mb-1">Quantity *</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value) || 0)}
                    className="w-full bg-[#121226] border border-white/10 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="text-gray-400 block mb-1">Rate (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.rate}
                    onChange={(e) => handleItemChange(idx, 'rate', Number(e.target.value) || 0)}
                    className="w-full bg-[#121226] border border-white/10 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold"
                    required
                  />
                </div>
              </div>

              {/* Cubicle Technical Specifications Sub-Card */}
              <div className="bg-[#121226]/80 border border-white/5 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>⚙️</span> Cubicle Technical Specifications
                  </span>
                  <span className="text-[11px] text-gray-400">Board type, dimensions &amp; colors</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-gray-400 block mb-1">Board Type *</label>
                    <select
                      value={item.boardType || 'HPL'}
                      onChange={(e) => handleItemChange(idx, 'boardType', e.target.value)}
                      className="w-full bg-[#0a0a1a] border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
                    >
                      <option value="HPL">HPL (High Pressure Compact Laminate)</option>
                      <option value="HDF">HDF (High Density Fibreboard)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-gray-400 block mb-1">Board Thickness</label>
                    <input
                      type="text"
                      value={item.boardThickness || ''}
                      onChange={(e) => handleItemChange(idx, 'boardThickness', e.target.value)}
                      placeholder="e.g. 12mm / 18mm"
                      className="w-full bg-[#0a0a1a] border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 block mb-1">Board Color</label>
                    <input
                      type="text"
                      value={item.boardColor || ''}
                      onChange={(e) => handleItemChange(idx, 'boardColor', e.target.value)}
                      placeholder="e.g. D.No. 123 – Oyster White"
                      className="w-full bg-[#0a0a1a] border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 block mb-1">Cubicle Size</label>
                    <input
                      type="text"
                      value={item.cubicleSize || ''}
                      onChange={(e) => handleItemChange(idx, 'cubicleSize', e.target.value)}
                      placeholder="e.g. 1000mm W × 1500mm D"
                      className="w-full bg-[#0a0a1a] border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 block mb-1">Door Size</label>
                    <input
                      type="text"
                      value={item.doorSize || ''}
                      onChange={(e) => handleItemChange(idx, 'doorSize', e.target.value)}
                      placeholder="e.g. 600mm × 1785mm"
                      className="w-full bg-[#0a0a1a] border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 block mb-1">Overall Height</label>
                    <input
                      type="text"
                      value={item.overallHeight || ''}
                      onChange={(e) => handleItemChange(idx, 'overallHeight', e.target.value)}
                      placeholder="e.g. 1980mm (incl. 100mm ground clearance)"
                      className="w-full bg-[#0a0a1a] border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className="text-gray-400 block mb-1">Hardware Package</label>
                    <input
                      type="text"
                      value={item.hardwarePackage || ''}
                      onChange={(e) => handleItemChange(idx, 'hardwarePackage', e.target.value)}
                      placeholder="e.g. SS 304 Stainless Steel (Satin/Brushed)"
                      className="w-full bg-[#0a0a1a] border border-white/10 rounded-lg px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Line Total */}
              <div className="flex justify-end pt-1">
                <span className="text-xs font-mono font-bold text-gray-300">
                  Line Total: <span className="text-[#7FB706]">₹ {((Number(item.quantity) || 0) * (Number(item.rate) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Installation & Commercial Pricing Options ──────────── */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-[#7FB706]" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Installation &amp; Commercial Pricing Options
            </h4>
          </div>
          <span className="text-xs text-[#7FB706] font-mono">
            {effectiveCubicleCount} Cubicle{effectiveCubicleCount === 1 ? '' : 's'} detected in items
          </span>
        </div>

        {/* Installation Charges Per Cubicle Sub-block */}
        <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <span>🔧 Cubicle Installation Charges (Per Cubicle Calculation)</span>
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400">Presets:</span>
              {[
                { label: '₹ 800', rate: 800 },
                { label: '₹ 1,000 (Std)', rate: 1000 },
                { label: '₹ 1,200', rate: 1200 },
                { label: '₹ 1,500', rate: 1500 },
                { label: 'Free (₹ 0)', rate: 0 },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    const cCount = installationCubicleCount !== undefined && installationCubicleCount > 0 ? installationCubicleCount : detectedCubicleCount;
                    const tot = p.rate * (p.rate === 0 ? 0 : cCount);
                    setInstallationRatePerCubicle(p.rate);
                    setInstallationCubicleCount(cCount);
                    setInstallationCharge(tot);
                  }}
                  className="px-2 py-0.5 rounded text-[11px] font-medium bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-gray-400 block mb-1">Rate (₹ / Cubicle)</label>
              <input
                type="number"
                min="0"
                step="1"
                value={installationRatePerCubicle ?? 1000}
                onChange={(e) => {
                  const rate = Number(e.target.value) || 0;
                  const count = installationCubicleCount !== undefined && installationCubicleCount > 0 ? installationCubicleCount : detectedCubicleCount;
                  setInstallationRatePerCubicle(rate);
                  setInstallationCharge(rate * count);
                }}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                placeholder="1000"
              />
              <span className="text-[10px] text-slate-400">Default: ₹ 1,000 / Cubicle</span>
            </div>

            <div>
              <label className="text-gray-400 block mb-1">Cubicles (Qty)</label>
              <input
                type="number"
                min="0"
                step="1"
                value={installationCubicleCount !== undefined && installationCubicleCount > 0 ? installationCubicleCount : (detectedCubicleCount || '')}
                onChange={(e) => {
                  const count = Number(e.target.value) || 0;
                  const rate = installationRatePerCubicle ?? 1000;
                  setInstallationCubicleCount(count);
                  setInstallationCharge(rate * count);
                }}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                placeholder="Number of cubicles"
              />
              <span className="text-[10px] text-slate-400">
                {detectedCubicleCount > 0
                  ? `Auto-detected: ${detectedCubicleCount} Cubicle${detectedCubicleCount === 1 ? '' : 's'}`
                  : '0 Cubicles in item list (Hardware/Board only)'}
              </span>
            </div>

            <div>
              <label className="text-gray-400 block mb-1">Total Installation Charge (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={installationCharge || 0}
                onChange={(e) => {
                  const total = Number(e.target.value) || 0;
                  const count = installationCubicleCount !== undefined && installationCubicleCount > 0 ? installationCubicleCount : detectedCubicleCount;
                  const derivedRate = count > 0 ? Math.round(total / count) : 0;
                  setInstallationCharge(total);
                  setInstallationRatePerCubicle(derivedRate);
                }}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs px-3 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
            <span>
              📄 <strong>Mentioned on Sales Order:</strong> Cubicle Installation Charges{' '}
              {(installationCharge || 0) > 0 && (installationCubicleCount || detectedCubicleCount) > 0
                ? `(@ ₹ ${(installationRatePerCubicle ?? 1000).toLocaleString('en-IN')}/Cubicle for ${installationCubicleCount || detectedCubicleCount} Cubicle${(installationCubicleCount || detectedCubicleCount) === 1 ? '' : 's'})`
                : '(Nil / Client Scope)'}
            </span>
            <div className="flex items-center gap-3">
              <span className="font-mono font-bold text-white text-sm">
                ₹ {Number(installationCharge || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <button
                type="button"
                onClick={handleAddInstallationItem}
                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow"
                title="Add as a formal SAC 995469 line item in the items table"
              >
                <Plus className="w-3 h-3" /> Add as Line Item
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Commercial Terms & Conditions ──────────────────────── */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Commercial Terms &amp; Conditions
            </h4>
          </div>
          <span className="text-xs text-gray-400 font-mono">{terms.length} clause(s)</span>
        </div>

        <div className="space-y-2 text-xs">
          {terms.map((term, tIdx) => (
            <div
              key={tIdx}
              className="flex items-start justify-between gap-3 p-2.5 rounded-xl bg-[#0a0a1a] border border-white/5"
            >
              <div className="flex items-start gap-2">
                <span className="text-gray-500 font-mono font-bold mt-0.5">{tIdx + 1}.</span>
                <span className="text-gray-300">{term}</span>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveTerm(tIdx)}
                className="p-1 rounded text-gray-500 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {/* Add custom clause */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="text"
              value={newTermText}
              onChange={(e) => setNewTermText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTerm();
                }
              }}
              placeholder="Add another commercial condition or warranty clause..."
              className="flex-1 bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-[#7FB706] focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddTerm}
              className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold"
            >
              + Add Term
            </button>
          </div>
        </div>
      </div>

      {/* ── Sticky Bottom Financial Summary & Action Dock ──────── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a1a]/95 backdrop-blur-md border-t border-white/10 px-4 sm:px-8 py-3.5 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Subtotal, Freight, Delhi Tax Split */}
          <div className="flex items-center gap-4 sm:gap-8 text-xs flex-wrap justify-center sm:justify-start">
            <div>
              <span className="text-gray-400 block text-[11px]">Subtotal:</span>
              <span className="font-mono font-bold text-white text-sm">
                ₹ {subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {(installationCharge || 0) > 0 && (
              <div>
                <span className="text-gray-400 block text-[11px]">
                  Installation (@₹{effectiveInstallRate}):
                </span>
                <span className="font-mono font-bold text-white text-sm">
                  ₹ {Number(installationCharge).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <div>
                <span className="text-gray-400 block text-[11px]">Freight (₹):</span>
                <input
                  type="number"
                  min={0}
                  value={freightAmount}
                  onChange={(e) => setFreightAmount(Number(e.target.value) || 0)}
                  className="w-24 bg-[#121226] border border-white/10 rounded px-2 py-1 text-white font-mono text-xs"
                />
              </div>
            </div>

            {gstBreakdown.isDelhi ? (
              <div className="flex items-center gap-3 text-blue-400">
                <div>
                  <span className="text-gray-400 block text-[11px]">CGST (9%):</span>
                  <span className="font-mono font-bold">
                    ₹ {gstBreakdown.cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">SGST (9%):</span>
                  <span className="font-mono font-bold">
                    ₹ {gstBreakdown.sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-purple-400">
                <span className="text-gray-400 block text-[11px]">IGST (18%):</span>
                <span className="font-mono font-bold">
                  ₹ {gstBreakdown.igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            <div className="border-l border-white/10 pl-4">
              <span className="text-gray-400 block text-[11px]">Grand Total:</span>
              <span className="font-mono font-extrabold text-[#7FB706] text-lg sm:text-xl">
                ₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate(`/admin/dashboard/sales-orders/${id}`)}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-[#030213] font-bold rounded-xl text-xs transition-all shadow-lg shadow-[#7FB706]/20 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {submitting ? 'Saving Order...' : 'Save Sales Order'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
