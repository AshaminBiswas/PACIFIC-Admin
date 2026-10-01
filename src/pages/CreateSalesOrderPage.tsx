import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShoppingBag,
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Building2,
  Truck,
  Layers,
  FileText,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  CreditCard,
  MapPin,
  Wrench,
  Copy,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { salesOrdersApi } from '../api/salesOrdersApi';
import { piApi } from '../api/proformaApi';
import { salesQuotationsApi } from '../api/salesQuotationsApi';
import { crmApi } from '../api/crmApi';
import { companiesApi } from '../api/companyApi';
import { productCatalogApi } from '../api/productCatalogApi';
import {
  getMergedQuotationModels,
  formatModelHardwareInclusions,
  extractModelDimensions,
} from '../utils/quotationProductPresets';
import DocumentFlowTimeline from '../components/common/DocumentFlowTimeline';
import type { BusinessParty, CompanyProfile, ProductCatalogModel, SalesQuotation, ProformaInvoice } from '../types/admin';
import { calculateGstSplit, isDelhiState, GST_STATE_CODE_MAP, isRestroomCubicleItem } from '../utils/tax';
import {
  DEFAULT_ACCESSORIES_TEXT,
  type CreateItem,
  type BillingAddressData,
  type DeliveryAddressData,
} from './CreateProformaPage';
import CustomerSearchSelect from '../components/common/CustomerSearchSelect';

const LOCAL_STORAGE_KEY = 'pacific_create_sales_order_v2';

export interface CreateSalesOrderFormData {
  customerId: string;
  companyProfileId: string;
  quotationId: string;
  quotationRef: string;
  proformaInvoiceId: string;
  piNumber: string;
  clientPoNumber: string;
  clientPoDate: string;
  placeOfSupply: string;
  placeOfSupplyStateCode: string;
  installationCharge?: number;
  installationRatePerCubicle?: number;
  installationCubicleCount?: number;
  freightAmount: number;
  selectedHardwarePreset?: string;
  accessoriesText: string;
  billingAddress: BillingAddressData;
  deliveryAddress: DeliveryAddressData;
  items: CreateItem[];
  terms: string[];
}

const INITIAL_FORM: CreateSalesOrderFormData = {
  customerId: '',
  companyProfileId: '',
  quotationId: '',
  quotationRef: '',
  proformaInvoiceId: '',
  piNumber: '',
  clientPoNumber: '',
  clientPoDate: '',
  placeOfSupply: 'Delhi',
  placeOfSupplyStateCode: '07',
  installationCharge: 0,
  installationRatePerCubicle: 1000,
  installationCubicleCount: 0,
  freightAmount: 0,
  selectedHardwarePreset: 'SS_304',
  accessoriesText: DEFAULT_ACCESSORIES_TEXT,
  billingAddress: {
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
  },
  deliveryAddress: {
    partyName: '',
    addressLine: '',
    city: 'New Delhi',
    pincode: '',
    state: 'Delhi',
    stateCode: '07',
    phone: '',
  },
  items: [
    {
      description: 'Pacific Classique Restroom Cubicle System (12mm Compact Laminate)',
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
  ],
  terms: [
    'Goods once dispatched will not be taken back or exchanged.',
    'Interest @ 18% per annum will be charged if payment is delayed beyond agreed terms.',
    'Pacific is not responsible for transit damage after handover to carrier.',
    'Site readiness, civil unloading, and electricity for installation to be provided by client.',
    'Subject to Delhi jurisdiction only.',
  ],
};

export default function CreateSalesOrderPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [lastSaved, setLastSaved] = useState('');

  // Lookups
  const [customers, setCustomers] = useState<BusinessParty[]>([]);
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [quotations, setQuotations] = useState<SalesQuotation[]>([]);
  const [proformaInvoices, setProformaInvoices] = useState<ProformaInvoice[]>([]);
  const [catalogModels, setCatalogModels] = useState<ProductCatalogModel[]>([]);

  // Selected imports
  const [selectedQuoteId, setSelectedQuoteId] = useState('');
  const [selectedPiId, setSelectedPiId] = useState('');

  // Form State
  const [formData, setFormData] = useState<CreateSalesOrderFormData>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) return { ...INITIAL_FORM, ...JSON.parse(cached) };
    } catch {}
    return INITIAL_FORM;
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [newTermText, setNewTermText] = useState('');

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

  // Load Lookups
  const loadLookups = useCallback(async () => {
    setLoadingLookups(true);
    try {
      const [custRes, compRes, quoteRes, piRes, modelsList] = await Promise.all([
        crmApi.listCustomers({ limit: 100 }),
        companiesApi.list().catch(() => ({ data: { data: [] } })),
        salesQuotationsApi.list({ limit: 50 }).catch(() => ({ data: { data: { items: [] } } })),
        piApi.list({ limit: 50 }).catch(() => ({ data: { data: { items: [] } } })),
        productCatalogApi.listModels().catch(() => []),
      ]);

      if (custRes.data?.data?.items) setCustomers(custRes.data.data.items);
      const companyList = compRes.data?.data;
      if (companyList && companyList.length > 0) {
        setCompanies(companyList);
        setFormData((prev) => ({
          ...prev,
          companyProfileId: prev.companyProfileId || companyList[0].id,
        }));
      }
      setQuotations(quoteRes.data?.data?.items || (quoteRes.data as any)?.items || []);
      setProformaInvoices(piRes.data?.data?.items || (piRes.data as any)?.items || []);
      setCatalogModels(getMergedQuotationModels(modelsList || []));
    } catch (err) {
      console.error('Failed to load lookups:', err);
    } finally {
      setLoadingLookups(false);
    }
  }, []);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(formData));
      setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch {}
  }, [formData]);

  const handleResetDraft = () => {
    if (confirm('Reset draft? All inputs will be cleared.')) {
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } catch {}
      setFormData({
        ...INITIAL_FORM,
        companyProfileId: companies[0]?.id || '',
      });
      setSelectedQuoteId('');
      setSelectedPiId('');
      setFieldErrors({});
    }
  };

  // Customer Select
  const handleCustomerSelect = (cId: string) => {
    const cust = customers.find((c) => c.id === cId);
    if (!cust) {
      setFormData((prev) => ({ ...prev, customerId: cId }));
      return;
    }

    const bAddr = cust.addresses?.find((a: any) => a.addressType === 'BILLING' || a.isDefaultBilling) || cust.addresses?.[0];
    const sAddr = cust.addresses?.find((a: any) => a.addressType === 'SHIPPING' || a.isDefaultShipping) || bAddr;

    const bState = bAddr?.state || 'Delhi';
    const bStateCode = bAddr?.stateCode || (bState.toLowerCase().includes('delhi') ? '07' : '07');

    setFormData((prev) => ({
      ...prev,
      customerId: cId,
      placeOfSupply: bState,
      placeOfSupplyStateCode: bStateCode,
      billingAddress: {
        partyName: cust.legalName || cust.tradeName || prev.billingAddress.partyName,
        gstin: cust.gstin || prev.billingAddress.gstin,
        pan: cust.pan || (cust.gstin && cust.gstin.length === 15 ? cust.gstin.substring(2, 12) : prev.billingAddress.pan),
        addressLine: [bAddr?.addressLine1, bAddr?.addressLine2].filter(Boolean).join(', ') || prev.billingAddress.addressLine,
        city: bAddr?.city || prev.billingAddress.city,
        pincode: bAddr?.postalCode || (bAddr as any)?.pincode || prev.billingAddress.pincode,
        state: bState,
        stateCode: bStateCode,
        phone: cust.phone || (cust as any).contactPhone || prev.billingAddress.phone,
        email: cust.email || (cust as any).contactEmail || prev.billingAddress.email,
      },
      deliveryAddress: {
        partyName: cust.tradeName || cust.legalName || prev.deliveryAddress.partyName,
        addressLine: [sAddr?.addressLine1, sAddr?.addressLine2].filter(Boolean).join(', ') || prev.deliveryAddress.addressLine,
        city: sAddr?.city || prev.deliveryAddress.city,
        pincode: sAddr?.postalCode || (sAddr as any)?.pincode || prev.deliveryAddress.pincode,
        state: sAddr?.state || bState,
        stateCode: sAddr?.stateCode || bStateCode,
        phone: cust.phone || (cust as any).contactPhone || prev.deliveryAddress.phone,
      },
    }));
  };

  // Copy Billing to Delivery
  const handleCopyBillingToDelivery = () => {
    setFormData((prev) => ({
      ...prev,
      deliveryAddress: {
        partyName: prev.billingAddress.partyName,
        addressLine: prev.billingAddress.addressLine,
        city: prev.billingAddress.city,
        pincode: prev.billingAddress.pincode,
        state: prev.billingAddress.state,
        stateCode: prev.billingAddress.stateCode,
        phone: prev.billingAddress.phone,
      },
    }));
  };

  // Import from accepted Quotation
  const handleImportQuotation = async (quoteId: string) => {
    setSelectedQuoteId(quoteId);
    if (!quoteId) return;
    try {
      const res = await salesQuotationsApi.getById(quoteId);
      const q = res.data?.data ?? (res.data as any);
      if (!q) return;

      const clientName = q.recipientName || q.recipientCompany || q.customer?.legalName || '';
      const address = q.recipientAddress || q.customer?.addresses?.[0]?.addressLine1 || '';
      const phone = q.recipientPhone || q.customer?.phone || '';
      const email = q.recipientEmail || q.customer?.email || '';
      const gstin = q.customerGstin || q.customer?.gstin || '';
      const pan = (q.customer as any)?.pan || (gstin.length === 15 ? gstin.substring(2, 12) : '');

      const quoteItems: CreateItem[] = (q.items || []).map((it: any) => ({
        description: it.description || it.itemDescription || 'Pacific Restroom Cubicle System',
        hsnSac: '940320',
        quantity: Number(it.quantity) || 1,
        unit: it.unit || 'NOS',
        rate: Number(it.rate ?? it.unitPrice ?? 0),
        gstRate: Number(q.gstRate || 18),
        boardType: it.boardType || '12mm Compact Laminate HPL Board',
        boardThickness: it.boardThickness || '12mm (Tolerance +/- 0.3mm)',
        boardColor: it.boardColor || 'Solid / Woodgrain Finish',
        cubicleSize: it.cubicleSize || '1000mm (W) x 1200mm (D) x 1980mm (H)',
        doorSize: it.doorSize || '600mm x 1800mm',
        overallHeight: it.overallHeight || '1980mm including 100mm-150mm ground gap',
        hardwarePackage: it.hardwarePackage || 'SS 304 Stainless Steel (Satin/Brushed)',
      }));

      const isDel = isDelhiState(q.recipientAddress, gstin);
      const posState = isDel ? 'Delhi' : (q.recipientAddress?.split(',').pop()?.trim() || 'Delhi');
      const posCode = isDel ? '07' : '07';

      setFormData((prev) => ({
        ...prev,
        customerId: q.customerId || prev.customerId,
        quotationId: q.id,
        quotationRef: q.referenceNumber,
        placeOfSupply: posState,
        placeOfSupplyStateCode: posCode,
        freightAmount: Number(q.freightAmount) || 0,
        installationCharge: Number(q.installationCharge) || 0,
        installationRatePerCubicle: q.installationRatePerCubicle || (Number(q.installationCharge) > 0 ? Math.round(Number(q.installationCharge) / (q.installationCubicleCount || 1)) : 1000),
        installationCubicleCount: q.installationCubicleCount || 0,
        accessoriesText: q.accessoriesText || prev.accessoriesText,
        billingAddress: {
          ...prev.billingAddress,
          partyName: clientName,
          gstin,
          pan,
          addressLine: address,
          phone,
          email,
          state: posState,
          stateCode: posCode,
        },
        deliveryAddress: {
          ...prev.deliveryAddress,
          partyName: clientName,
          addressLine: address,
          phone,
          state: posState,
          stateCode: posCode,
        },
        items: quoteItems.length > 0 ? quoteItems : prev.items,
      }));

      alert(`Specifications and pricing imported from Quotation ${q.referenceNumber}!`);
    } catch (err) {
      alert('Failed to import quotation details.');
    }
  };

  // Import from Proforma Invoice
  const handleImportProforma = async (piId: string) => {
    setSelectedPiId(piId);
    if (!piId) return;
    try {
      const res = await piApi.getById(piId);
      const pi = res.data?.data ?? (res.data as any);
      if (!pi) return;

      const billParty = pi.parties?.find((p: any) => p.partyRole === 'BILL_TO');
      const shipParty = pi.parties?.find((p: any) => p.partyRole === 'SHIP_TO') || billParty;

      const piItems: CreateItem[] = (pi.items || []).map((it: any) => ({
        description: it.description || 'Pacific Restroom Cubicle System',
        hsnSac: it.hsnSac || '940320',
        quantity: Number(it.quantity) || 1,
        unit: it.unit || 'NOS',
        rate: Number(it.rate ?? 0),
        gstRate: Number(it.gstRate || 18),
        boardType: it.boardType || '12mm Compact Laminate HPL Board',
        boardThickness: it.boardThickness || '12mm (Tolerance +/- 0.3mm)',
        boardColor: it.boardColor || 'Solid / Woodgrain Finish',
        cubicleSize: it.cubicleSize || '1000mm (W) x 1200mm (D) x 1980mm (H)',
        doorSize: it.doorSize || '600mm x 1800mm',
        overallHeight: it.overallHeight || '1980mm including 100mm-150mm ground gap',
        hardwarePackage: it.hardwarePackage || 'SS 304 Stainless Steel (Satin/Brushed)',
      }));

      const termsList = Array.isArray(pi.terms) ? pi.terms.map((t: any) => t.text || t) : formData.terms;

      setFormData((prev) => ({
        ...prev,
        customerId: pi.customerId || prev.customerId,
        proformaInvoiceId: pi.id,
        piNumber: pi.piNumber,
        quotationId: pi.quotationId || prev.quotationId,
        quotationRef: pi.quotationRef || prev.quotationRef,
        placeOfSupply: pi.placeOfSupply || 'Delhi',
        placeOfSupplyStateCode: pi.placeOfSupplyStateCode || '07',
        clientPoNumber: pi.linkedPoNumber || prev.clientPoNumber,
        clientPoDate: pi.linkedPoDate ? new Date(pi.linkedPoDate).toISOString().split('T')[0] : prev.clientPoDate,
        freightAmount: Number(pi.freightAmount) || 0,
        installationCharge: Number(pi.installationCharge) || 0,
        installationRatePerCubicle: pi.installationRatePerCubicle || (Number(pi.installationCharge) > 0 ? Math.round(Number(pi.installationCharge) / (pi.installationCubicleCount || 1)) : 1000),
        installationCubicleCount: pi.installationCubicleCount || 0,
        accessoriesText: pi.accessoriesText || prev.accessoriesText,
        billingAddress: {
          partyName: billParty?.partyName || pi.customer?.legalName || prev.billingAddress.partyName,
          gstin: billParty?.gstin || pi.customer?.gstin || '',
          pan: (billParty as any)?.pan || pi.customer?.pan || '',
          addressLine: billParty?.addressLine || '',
          city: (billParty as any)?.city || 'New Delhi',
          pincode: (billParty as any)?.pincode || '',
          state: billParty?.state || 'Delhi',
          stateCode: billParty?.stateCode || '07',
          phone: billParty?.phone || pi.customer?.phone || '',
          email: billParty?.email || pi.customer?.email || '',
        },
        deliveryAddress: {
          partyName: shipParty?.partyName || billParty?.partyName || prev.deliveryAddress.partyName,
          addressLine: shipParty?.addressLine || '',
          city: (shipParty as any)?.city || 'New Delhi',
          pincode: (shipParty as any)?.pincode || '',
          state: shipParty?.state || 'Delhi',
          stateCode: shipParty?.stateCode || '07',
          phone: shipParty?.phone || '',
        },
        items: piItems.length > 0 ? piItems : prev.items,
        terms: termsList,
      }));

      alert(`Specifications and commercial details imported from PI ${pi.piNumber}!`);
    } catch (err) {
      alert('Failed to import Proforma Invoice details.');
    }
  };

  // Model Selection for item (only listed models)
  const handleSelectModel = (idx: number, modelId: string) => {
    if (!modelId) {
      handleItemChange(idx, 'modelId', '');
      return;
    }

    const selected = catalogModels.find((m) => m.id === modelId || m.slug === modelId);
    if (!selected) return;

    const dims = extractModelDimensions(selected);
    const hwText = formatModelHardwareInclusions(selected);

    setFormData((prev: CreateSalesOrderFormData) => {
      const nextItems = [...prev.items];
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

      // Auto-fetch and replace Standard Inclusions & Hardware Accessories
      return {
        ...prev,
        accessoriesText: hwText,
        items: nextItems,
      };
    });
  };

  // Item Row operations
  const handleItemChange = (idx: number, field: keyof CreateItem, val: any) => {
    setFormData((prev) => {
      const updated = [...prev.items];
      updated[idx] = { ...updated[idx], [field]: val };
      return { ...prev, items: updated };
    });
  };

  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
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
      ],
    }));
  };

  const handleDuplicateItem = (idx: number) => {
    setFormData((prev) => {
      const copy = { ...prev.items[idx] };
      const updated = [...prev.items];
      updated.splice(idx + 1, 0, copy);
      return { ...prev, items: updated };
    });
  };

  const handleRemoveItem = (idx: number) => {
    if (formData.items.length <= 1) {
      alert('Order must contain at least one line item.');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  // Terms handlers
  const handleAddTerm = () => {
    if (!newTermText.trim()) return;
    setFormData((prev) => ({ ...prev, terms: [...prev.terms, newTermText.trim()] }));
    setNewTermText('');
  };

  const handleRemoveTerm = (tIdx: number) => {
    setFormData((prev) => ({
      ...prev,
      terms: prev.terms.filter((_, i) => i !== tIdx),
    }));
  };

  const handleAddInstallationItem = () => {
    const count = effectiveCubicleCount > 0 ? effectiveCubicleCount : 1;
    const rate = effectiveInstallRate;
    setFormData((f) => ({
      ...f,
      items: [
        ...f.items,
        {
          description: `Supply & Erection / Installation Charges for Restroom Cubicles (@ ₹ ${rate.toLocaleString('en-IN')}/Cubicle for ${count} Cubicle${count === 1 ? '' : 's'})`,
          hsnSac: '995469',
          unit: 'CUBICLE',
          quantity: count,
          rate: rate,
          gstRate: 18,
        },
      ],
    }));
  };

  // Calculations
  const subtotal = useMemo(
    () => formData.items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.rate) || 0), 0),
    [formData.items]
  );

  const detectedCubicleCount = useMemo(() => {
    return formData.items
      .filter(isRestroomCubicleItem)
      .reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  }, [formData.items]);

  const effectiveCubicleCount = formData.installationCubicleCount !== undefined && formData.installationCubicleCount > 0
    ? formData.installationCubicleCount
    : detectedCubicleCount;
  const effectiveInstallRate = formData.installationRatePerCubicle ?? (effectiveCubicleCount > 0 && formData.installationCharge ? Math.round(Number(formData.installationCharge) / effectiveCubicleCount) : 1000);

  const taxableTotal = subtotal + Number(formData.freightAmount || 0) + Number(formData.installationCharge || 0);

  const gstBreakdown = useMemo(() => {
    return calculateGstSplit(
      taxableTotal,
      formData.placeOfSupplyStateCode || formData.billingAddress.stateCode,
      formData.placeOfSupply || formData.billingAddress.state,
      false,
      18,
      formData.billingAddress.gstin,
      formData.billingAddress.addressLine
    );
  }, [taxableTotal, formData.placeOfSupplyStateCode, formData.placeOfSupply, formData.billingAddress]);

  const grandTotal = Math.round(taxableTotal + gstBreakdown.totalTax);

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {};
    if (!formData.customerId) errors.customerId = 'Please select a customer';
    if (!formData.companyProfileId && companies.length > 0) formData.companyProfileId = companies[0].id;
    if (!formData.billingAddress.partyName) errors.billingParty = 'Billing party name is required';
    if (!formData.billingAddress.addressLine) errors.billingAddress = 'Billing address line is required';
    if (formData.items.length === 0) errors.items = 'At least one line item is required';

    formData.items.forEach((it, idx) => {
      if (!it.description?.trim()) errors[`item_${idx}_desc`] = 'Description required';
      if ((Number(it.quantity) || 0) <= 0) errors[`item_${idx}_qty`] = 'Quantity must be > 0';
      if ((Number(it.rate) || 0) <= 0) errors[`item_${idx}_rate`] = 'Rate must be > 0';
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      alert('Please fill all required fields before creating the Sales Order.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customerId: formData.customerId,
        companyProfileId: formData.companyProfileId || companies[0]?.id,
        source: formData.proformaInvoiceId
          ? 'CONVERTED_PROFORMA'
          : formData.quotationId
          ? 'CONVERTED_QUOTATION'
          : 'DIRECT_ENTRY',
        quotationId: formData.quotationId || null,
        quotationRef: formData.quotationRef || null,
        proformaInvoiceId: formData.proformaInvoiceId || null,
        piNumber: formData.piNumber || null,
        customerPoNumber: formData.clientPoNumber || null,
        customerPoDate: formData.clientPoDate ? new Date(formData.clientPoDate).toISOString() : null,
        placeOfSupply: formData.placeOfSupply,
        placeOfSupplyStateCode: formData.placeOfSupplyStateCode,
        freightAmount: Number(formData.freightAmount) || 0,
        installationCharge: Number(formData.installationCharge) || 0,
        installationRatePerCubicle: Number(formData.installationCharge) > 0 ? (formData.installationRatePerCubicle ?? 1000) : undefined,
        installationCubicleCount: Number(formData.installationCharge) > 0 ? (formData.installationCubicleCount || detectedCubicleCount || undefined) : undefined,
        taxRate: 18,
        accessoriesText: formData.accessoriesText,
        terms: formData.terms,
        requiresApproval: false,
        billingAddress: {
          partyName: formData.billingAddress.partyName,
          gstin: formData.billingAddress.gstin,
          pan: formData.billingAddress.pan,
          address: formData.billingAddress.addressLine,
          city: formData.billingAddress.city,
          pincode: formData.billingAddress.pincode,
          state: formData.billingAddress.state,
          stateCode: formData.billingAddress.stateCode,
          phone: formData.billingAddress.phone,
          email: formData.billingAddress.email,
        },
        shippingAddress: {
          partyName: formData.deliveryAddress.partyName || formData.billingAddress.partyName,
          recipient: formData.deliveryAddress.partyName || formData.billingAddress.partyName,
          address: formData.deliveryAddress.addressLine,
          city: formData.deliveryAddress.city,
          pincode: formData.deliveryAddress.pincode,
          state: formData.deliveryAddress.state,
          stateCode: formData.deliveryAddress.stateCode,
          phone: formData.deliveryAddress.phone,
        },
        items: formData.items.map((it) => ({
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

      const res = await salesOrdersApi.createDirect(payload);
      const created = res.data?.data ?? (res.data as any);
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } catch {}

      alert('Sales Order generated successfully!');
      navigate(`/admin/dashboard/sales-orders/${created.id}`);
    } catch (err: any) {
      console.error('Failed to create Sales Order:', err);
      alert(err.response?.data?.message || err.message || 'Failed to create Sales Order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-28 max-w-7xl mx-auto">
      {/* ── Top Bar ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#121226] border border-white/5 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/dashboard/sales-orders')}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
            title="Back to Sales Orders Hub"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-black text-white font-mono flex items-center gap-2">
                <ShoppingBag className="w-6 h-6 text-[#7FB706]" />
                Create New Sales Order
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Direct / Converted Entry
              </span>
              {lastSaved && (
                <span className="text-[11px] text-gray-500 font-mono">
                  Auto-saved {lastSaved}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Create an official confirmed sales order with full technical hardware specifications and dual GST breakdown.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetDraft}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-[#030213] font-bold rounded-xl text-xs transition-all shadow-lg shadow-[#7FB706]/20 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {submitting ? 'Generating Order...' : 'Generate Sales Order'}
          </button>
        </div>
      </div>

      {/* ── Document Flow Timeline (Stage 3) ───────────────────── */}
      <DocumentFlowTimeline
        currentStage={3}
        documentRef="NEW ORDER"
        currentStatus="DRAFT"
        linkedDocs={{
          quotationId: formData.quotationId,
          quotationRef: formData.quotationRef,
          piNumber: formData.piNumber,
        }}
      />

      {/* ── Fast Import Toolbar (From Quotation or PI) ──────────── */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-white/5">
          <Download className="w-4 h-4 text-[#7FB706]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Fast Document Import (Pre-populate full specs & commercial terms)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Import from Quotation */}
          <div className="space-y-1.5">
            <label className="text-gray-400 font-medium flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-400" /> Import from Accepted Sales Quotation
            </label>
            <select
              value={selectedQuoteId}
              onChange={(e) => handleImportQuotation(e.target.value)}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-[#7FB706] focus:outline-none"
            >
              <option value="">-- Choose Accepted Quotation --</option>
              {quotations.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.referenceNumber} • {q.recipientName || q.recipientCompany || 'Customer'} (₹{Number(q.grandTotal || 0).toLocaleString('en-IN')})
                </option>
              ))}
            </select>
          </div>

          {/* Import from Proforma Invoice */}
          <div className="space-y-1.5">
            <label className="text-gray-400 font-medium flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-indigo-400" /> Import from Issued Proforma Invoice
            </label>
            <select
              value={selectedPiId}
              onChange={(e) => handleImportProforma(e.target.value)}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-[#7FB706] focus:outline-none"
            >
              <option value="">-- Choose Proforma Invoice --</option>
              {proformaInvoices.map((pi) => (
                <option key={pi.id} value={pi.id}>
                  {pi.piNumber} • {pi.customer?.legalName || 'Client'} (₹{Number(pi.grandTotal || 0).toLocaleString('en-IN')})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

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
            selectedCustomerId={formData.customerId}
            onSelectCustomer={(cId) => handleCustomerSelect(cId)}
            error={fieldErrors.customerId}
            label="Customer Party"
            placeholder="Search party name, email, GST, phone..."
            required
          />

          {/* Company Profile */}
          <div className="space-y-1.5">
            <label className="text-gray-400 font-medium">Issuer Company Profile</label>
            <select
              value={formData.companyProfileId}
              onChange={(e) => setFormData({ ...formData, companyProfileId: e.target.value })}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-[#7FB706] focus:outline-none"
            >
              {companies.map((cp) => (
                <option key={cp.id} value={cp.id}>
                  {cp.companyName}
                </option>
              ))}
            </select>
          </div>

          {/* Client PO Number */}
          <div className="space-y-1.5">
            <label className="text-gray-400 font-medium">Client PO Number</label>
            <input
              type="text"
              placeholder="e.g. PO-2026-8941"
              value={formData.clientPoNumber}
              onChange={(e) => setFormData({ ...formData, clientPoNumber: e.target.value })}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-[#7FB706] focus:outline-none font-mono"
            />
          </div>

          {/* Client PO Date */}
          <div className="space-y-1.5">
            <label className="text-gray-400 font-medium">Client PO Date</label>
            <input
              type="date"
              value={formData.clientPoDate}
              onChange={(e) => setFormData({ ...formData, clientPoDate: e.target.value })}
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
                value={formData.billingAddress.partyName}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    billingAddress: { ...formData.billingAddress, partyName: e.target.value },
                  })
                }
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
                  value={formData.billingAddress.gstin}
                  onChange={(e) => {
                    const gstin = e.target.value.toUpperCase();
                    const pan = gstin.length >= 12 ? gstin.substring(2, 12) : formData.billingAddress.pan;
                    const stCode = gstin.length >= 2 ? gstin.substring(0, 2) : formData.billingAddress.stateCode;
                    const stName = (stCode ? GST_STATE_CODE_MAP[stCode] : undefined) || (stCode === '07' ? 'Delhi' : formData.billingAddress.state);
                    setFormData({
                      ...formData,
                      placeOfSupply: stName,
                      placeOfSupplyStateCode: stCode,
                      billingAddress: {
                        ...formData.billingAddress,
                        gstin,
                        pan,
                        stateCode: stCode,
                        state: stName,
                      },
                    });
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
                  value={formData.billingAddress.pan}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      billingAddress: { ...formData.billingAddress, pan: e.target.value.toUpperCase() },
                    })
                  }
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-[#7FB706] focus:outline-none"
                  placeholder="ABCDE1234F"
                />
              </div>
            </div>

            <div>
              <label className="text-gray-400 block mb-1">Registered Address *</label>
              <textarea
                rows={2}
                value={formData.billingAddress.addressLine}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    billingAddress: { ...formData.billingAddress, addressLine: e.target.value },
                  })
                }
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-[#7FB706] focus:outline-none"
                placeholder="Plot / Building, Street, Area"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-gray-400 block mb-1">City</label>
                <input
                  type="text"
                  value={formData.billingAddress.city}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      billingAddress: { ...formData.billingAddress, city: e.target.value },
                    })
                  }
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs"
                />
              </div>
              <div>
                <label className="text-gray-400 block mb-1">State</label>
                <input
                  type="text"
                  value={formData.billingAddress.state}
                  onChange={(e) => {
                    const st = e.target.value;
                    const code = st.toLowerCase().includes('delhi') ? '07' : formData.billingAddress.stateCode;
                    setFormData({
                      ...formData,
                      placeOfSupply: st,
                      placeOfSupplyStateCode: code,
                      billingAddress: { ...formData.billingAddress, state: st, stateCode: code },
                    });
                  }}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs"
                />
              </div>
              <div>
                <label className="text-gray-400 block mb-1">Pincode</label>
                <input
                  type="text"
                  value={formData.billingAddress.pincode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      billingAddress: { ...formData.billingAddress, pincode: e.target.value },
                    })
                  }
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
                  value={formData.billingAddress.phone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      billingAddress: { ...formData.billingAddress, phone: e.target.value },
                    })
                  }
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs"
                />
              </div>
              <div>
                <label className="text-gray-400 block mb-1">Email</label>
                <input
                  type="email"
                  value={formData.billingAddress.email}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      billingAddress: { ...formData.billingAddress, email: e.target.value },
                    })
                  }
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
              onClick={handleCopyBillingToDelivery}
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
                value={formData.deliveryAddress.partyName}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    deliveryAddress: { ...formData.deliveryAddress, partyName: e.target.value },
                  })
                }
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-[#7FB706] focus:outline-none"
                placeholder="Consignee or Project Site Name"
              />
            </div>

            <div>
              <label className="text-gray-400 block mb-1">Site Delivery Address *</label>
              <textarea
                rows={2}
                value={formData.deliveryAddress.addressLine}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    deliveryAddress: { ...formData.deliveryAddress, addressLine: e.target.value },
                  })
                }
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-[#7FB706] focus:outline-none"
                placeholder="Plot / Project Location, Landmark"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-gray-400 block mb-1">City</label>
                <input
                  type="text"
                  value={formData.deliveryAddress.city}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      deliveryAddress: { ...formData.deliveryAddress, city: e.target.value },
                    })
                  }
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs"
                />
              </div>
              <div>
                <label className="text-gray-400 block mb-1">State</label>
                <input
                  type="text"
                  value={formData.deliveryAddress.state}
                  onChange={(e) => {
                    const st = e.target.value;
                    const code = st.toLowerCase().includes('delhi') ? '07' : formData.deliveryAddress.stateCode;
                    setFormData({
                      ...formData,
                      deliveryAddress: { ...formData.deliveryAddress, state: st, stateCode: code },
                    });
                  }}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs"
                />
              </div>
              <div>
                <label className="text-gray-400 block mb-1">Pincode</label>
                <input
                  type="text"
                  value={formData.deliveryAddress.pincode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      deliveryAddress: { ...formData.deliveryAddress, pincode: e.target.value },
                    })
                  }
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
                  value={formData.deliveryAddress.phone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      deliveryAddress: { ...formData.deliveryAddress, phone: e.target.value },
                    })
                  }
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs"
                  placeholder="+91-XXXXX-XXXXX"
                />
              </div>
              <div>
                <label className="text-gray-400 block mb-1">Place of Supply (GST)</label>
                <input
                  type="text"
                  value={formData.placeOfSupply}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({
                      ...formData,
                      placeOfSupply: val,
                      placeOfSupplyStateCode: val.toLowerCase().includes('delhi') ? '07' : formData.placeOfSupplyStateCode,
                    });
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
            value={formData.accessoriesText}
            onChange={(e) => setFormData({ ...formData, accessoriesText: e.target.value })}
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
          {formData.items.map((item, idx) => (
            <div
              key={idx}
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
                  {formData.items.length > 1 && (
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

              {/* Product Model Selection */}
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
                    const cCount = formData.installationCubicleCount !== undefined && formData.installationCubicleCount > 0 ? formData.installationCubicleCount : detectedCubicleCount;
                    const tot = p.rate * (p.rate === 0 ? 0 : cCount);
                    setFormData((f) => ({
                      ...f,
                      installationRatePerCubicle: p.rate,
                      installationCubicleCount: cCount,
                      installationCharge: tot,
                    }));
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
                value={formData.installationRatePerCubicle ?? 1000}
                onChange={(e) => {
                  const rate = Number(e.target.value) || 0;
                  const count = formData.installationCubicleCount !== undefined && formData.installationCubicleCount > 0 ? formData.installationCubicleCount : detectedCubicleCount;
                  setFormData((f) => ({
                    ...f,
                    installationRatePerCubicle: rate,
                    installationCharge: rate * count,
                  }));
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
                value={formData.installationCubicleCount !== undefined && formData.installationCubicleCount > 0 ? formData.installationCubicleCount : (detectedCubicleCount || '')}
                onChange={(e) => {
                  const count = Number(e.target.value) || 0;
                  const rate = formData.installationRatePerCubicle ?? 1000;
                  setFormData((f) => ({
                    ...f,
                    installationCubicleCount: count,
                    installationCharge: rate * count,
                  }));
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
                value={formData.installationCharge || 0}
                onChange={(e) => {
                  const total = Number(e.target.value) || 0;
                  const count = formData.installationCubicleCount !== undefined && formData.installationCubicleCount > 0 ? formData.installationCubicleCount : detectedCubicleCount;
                  const derivedRate = count > 0 ? Math.round(total / count) : 0;
                  setFormData((f) => ({
                    ...f,
                    installationCharge: total,
                    installationRatePerCubicle: derivedRate,
                  }));
                }}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs px-3 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
            <span>
              📄 <strong>Mentioned on Sales Order:</strong> Cubicle Installation Charges{' '}
              {(formData.installationCharge || 0) > 0 && (formData.installationCubicleCount || detectedCubicleCount) > 0
                ? `(@ ₹ ${(formData.installationRatePerCubicle ?? 1000).toLocaleString('en-IN')}/Cubicle for ${formData.installationCubicleCount || detectedCubicleCount} Cubicle${(formData.installationCubicleCount || detectedCubicleCount) === 1 ? '' : 's'})`
                : '(Nil / Client Scope)'}
            </span>
            <div className="flex items-center gap-3">
              <span className="font-mono font-bold text-white text-sm">
                ₹ {Number(formData.installationCharge || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
          <span className="text-xs text-gray-400 font-mono">{formData.terms.length} clause(s)</span>
        </div>

        <div className="space-y-2 text-xs">
          {formData.terms.map((term, tIdx) => (
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

            {(formData.installationCharge || 0) > 0 && (
              <div>
                <span className="text-gray-400 block text-[11px]">
                  Installation (@₹{effectiveInstallRate}):
                </span>
                <span className="font-mono font-bold text-white text-sm">
                  ₹ {Number(formData.installationCharge).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <div>
                <span className="text-gray-400 block text-[11px]">Freight (₹):</span>
                <input
                  type="number"
                  min={0}
                  value={formData.freightAmount}
                  onChange={(e) => setFormData({ ...formData, freightAmount: Number(e.target.value) || 0 })}
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
              onClick={() => navigate('/admin/dashboard/sales-orders')}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-[#030213] font-bold rounded-xl text-xs transition-all shadow-lg shadow-[#7FB706]/20 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {submitting ? 'Generating Order...' : 'Generate Sales Order'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
