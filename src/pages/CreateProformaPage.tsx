import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
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
  MapPin,
  Wrench,
  Copy,
  AlertTriangle,
  Package,
} from 'lucide-react';
import { piApi } from '../api/proformaApi';
import { crmApi } from '../api/crmApi';
import { companiesApi } from '../api/companyApi';
import { salesQuotationsApi } from '../api/salesQuotationsApi';
import { productCatalogApi } from '../api/productCatalogApi';
import {
  getMergedQuotationModels,
  formatModelHardwareInclusions,
  extractModelDimensions,
  extractModelHardwareItems,
  findMatchingCatalogModel,
} from '../utils/quotationProductPresets';
import DocumentFlowTimeline from '../components/common/DocumentFlowTimeline';
import CustomerSearchSelect from '../components/common/CustomerSearchSelect';
import type { BusinessParty, CompanyProfile, ProductCatalogModel, SalesQuotation } from '../types/admin';
import { calculateGstSplit, isDelhiState, GST_STATE_CODE_MAP, isRestroomCubicleItem } from '../utils/tax';

const LOCAL_STORAGE_KEY = 'pacific_create_proforma_v3';

export type PiScope = 'CUBICLE' | 'BOARD' | 'HARDWARE';

export const DEFAULT_ACCESSORIES_TEXT =
  '• Gravity Hinges: Self-closing SS 304 stainless steel gravity hinges with nylon cam mechanism.\n• Indicator Lock: SS 304 surface-mounted privacy lock with external red/white occupancy indicator and emergency release.\n• Supporting Shoe/Legs: SS 304 adjustable height support legs (100mm to 150mm ground clearance).\n• Coat Hook: SS 304 heavy-duty coat hook with integrated rubber door buffer.\n• Fasteners: Grade 304 stainless steel tamper-proof screws and expanding anchors.';

export interface CreateItem {
  id?: string;
  modelId?: string;
  customModelName?: string;
  modelName?: string;
  itemType?: 'cubicle' | 'hardware';
  systemCategory?: 'cubicle' | 'ump' | 'locker' | 'board' | 'hardware';
  isCustom?: boolean;
  parentModelId?: string;
  description: string;
  hsnSac: string;
  quantity: number;
  unit: string;
  rate: number;
  gstRate: number;
  boardType?: string;
  boardThickness?: string;
  boardColor?: string;
  cubicleSize?: string;
  doorSize?: string;
  overallHeight?: string;
  hardwarePackage?: string;
  make?: string;
}

export interface BillingAddressData {
  partyName: string;
  gstin: string;
  pan: string;
  addressLine: string;
  city: string;
  pincode: string;
  state: string;
  stateCode: string;
  phone: string;
  email: string;
}

export interface DeliveryAddressData {
  partyName: string;
  addressLine: string;
  city: string;
  pincode: string;
  state: string;
  stateCode: string;
  phone: string;
}

export interface CreateFormData {
  customerId: string;
  companyProfileId: string;
  piScope?: PiScope;
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
  installationCharge?: number;
  installationRatePerCubicle?: number;
  installationCubicleCount?: number;
  advancePercentage: number;
  selectedHardwarePreset?: string;
  accessoriesText: string;
  billingAddress: BillingAddressData;
  deliveryAddress: DeliveryAddressData;
  items: CreateItem[];
  terms: string[];
}

const DEFAULT_TERMS = [
  'Payment Terms: 50% Advance along with confirmed Purchase Order. Balance 50% prior to dispatch.',
  'Delivery Terms: 2-3 weeks from receipt of advance, approved shop drawings, and color confirmation.',
  'Warranty: We provide ten (10) years of warranty for partitions against any moisture-related defects and one (1) year warranty for workmanship and hardware against manufacturing defects.',
  'Goods once fabricated to custom restroom sizes cannot be cancelled or exchanged.',
  'GST and transport charges applicable as per statutory rates.',
  'Subject to Delhi/NCR jurisdiction.',
];

const INITIAL_FORM: CreateFormData = {
  customerId: '',
  companyProfileId: '',
  piScope: 'CUBICLE',
  placeOfSupply: 'Delhi',
  placeOfSupplyStateCode: '07',
  reverseCharge: false,
  modeOfTransport: 'Road',
  vehicleNumber: '',
  grLrNumber: '',
  linkedPoNumber: '',
  linkedPoDate: '',
  freightAmount: 0,
  installationCharge: 0,
  installationRatePerCubicle: 1000,
  installationCubicleCount: 0,
  advancePercentage: 50,
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
      modelId: 'std-delight',
      itemType: 'cubicle',
      systemCategory: 'cubicle',
      description: 'Pacific Delight (Cubicle)',
      hsnSac: '9403',
      quantity: 1,
      unit: 'NOS',
      rate: 18500,
      gstRate: 18,
      boardType: '12mm / 18mm Solid Compact Phenolic Laminate',
      boardThickness: '12mm',
      boardColor: 'D.No. 123 – Oyster White',
      cubicleSize: '1000 mm W × 1500 mm D',
      doorSize: '600 mm (Standard) / 900 mm (Accessible/ADA)',
      overallHeight: '1980 mm / 2000 mm (including 150mm floor gap)',
      hardwarePackage: 'SS Hardware',
    },
    {
      itemType: 'hardware',
      parentModelId: 'std-delight',
      description: 'Gravity Hinges (Self-Closing Pair with Nylon Cam)',
      hsnSac: '8302',
      quantity: 1,
      unit: 'PAIR',
      rate: 0,
      gstRate: 18,
    },
    {
      itemType: 'hardware',
      parentModelId: 'std-delight',
      description: 'Occupancy Indicator Lock with Emergency Release',
      hsnSac: '8302',
      quantity: 1,
      unit: 'SET',
      rate: 0,
      gstRate: 18,
    },
    {
      itemType: 'hardware',
      parentModelId: 'std-delight',
      description: 'Ergonomic Door Pull Handle / Knob',
      hsnSac: '8302',
      quantity: 1,
      unit: 'NOS',
      rate: 0,
      gstRate: 18,
    },
    {
      itemType: 'hardware',
      parentModelId: 'std-delight',
      description: 'Coat Hook with Integrated Rubber Buffer Stop',
      hsnSac: '8302',
      quantity: 1,
      unit: 'NOS',
      rate: 0,
      gstRate: 18,
    },
    {
      itemType: 'hardware',
      parentModelId: 'std-delight',
      description: 'Adjustable Supporting Legs (100–150mm ground clearance)',
      hsnSac: '8302',
      quantity: 2,
      unit: 'NOS',
      rate: 0,
      gstRate: 18,
    },
    {
      itemType: 'hardware',
      parentModelId: 'std-delight',
      description: 'Continuous Top Headrail Stabilizer Box Extrusion',
      hsnSac: '7610',
      quantity: 1,
      unit: 'RMT',
      rate: 0,
      gstRate: 18,
    },
    {
      itemType: 'hardware',
      parentModelId: 'std-delight',
      description: 'Wall Fixing U-Channels & SS 304 Fasteners Pack',
      hsnSac: '8302',
      quantity: 1,
      unit: 'SET',
      rate: 0,
      gstRate: 18,
    },
  ],
  terms: DEFAULT_TERMS,
};

export default function CreateProformaPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [formData, setFormData] = useState<CreateFormData>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          ...INITIAL_FORM,
          ...parsed,
          billingAddress: { ...INITIAL_FORM.billingAddress, ...(parsed.billingAddress || {}) },
          deliveryAddress: { ...INITIAL_FORM.deliveryAddress, ...(parsed.deliveryAddress || {}) },
          items: Array.isArray(parsed.items) && parsed.items.length > 0 ? parsed.items : INITIAL_FORM.items,
        };
      }
    } catch {}
    return INITIAL_FORM;
  });

  const [lastSaved, setLastSaved] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [newTermText, setNewTermText] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Lookups
  const [customers, setCustomers] = useState<BusinessParty[]>([]);
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [quotations, setQuotations] = useState<SalesQuotation[]>([]);
  const [catalogModels, setCatalogModels] = useState<ProductCatalogModel[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [selectedQuoteId, setSelectedQuoteId] = useState('');

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

  // Load lookup data
  const loadLookups = useCallback(async () => {
    setLoadingLookups(true);
    try {
      const [custRes, compRes, quoteRes, modelsList] = await Promise.all([
        crmApi.listCustomers({ limit: 100 }).catch(() => ({ data: { data: { items: [] } } })),
        companiesApi.list().catch(() => ({ data: { data: [] } })),
        salesQuotationsApi.list({ limit: 50 }).catch(() => ({ data: { data: { items: [] } } })),
        productCatalogApi.listModels().catch(() => []),
      ]);

      if (custRes.data?.data?.items) {
        setCustomers(custRes.data.data.items);
      }
      const companyList = compRes.data?.data;
      if (companyList && companyList.length > 0) {
        setCompanies(companyList);
        setFormData((prev) => ({
          ...prev,
          companyProfileId: prev.companyProfileId || companyList[0].id,
        }));
      }
      const quotes = quoteRes.data?.data?.items || (quoteRes.data as any)?.items || [];
      setQuotations(quotes);

      // Merge standard models with custom catalog models
      const merged = getMergedQuotationModels(modelsList || []);
      setCatalogModels(merged);
    } catch (err) {
      console.error('Failed to load lookup data:', err);
    } finally {
      setLoadingLookups(false);
    }
  }, []);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  // Auto-save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(formData));
      setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch {}
  }, [formData]);

  // Reset Draft
  const handleResetDraft = () => {
    if (confirm('Are you sure you want to reset this Proforma Invoice form? All unsaved inputs will be cleared.')) {
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } catch {}
      setFormData({
        ...INITIAL_FORM,
        companyProfileId: companies[0]?.id || '',
      });
      setSelectedQuoteId('');
      setFieldErrors({});
    }
  };

  // Customer selection auto-fill
  const handleCustomerSelect = (cId: string) => {
    const selected = customers.find((c) => c.id === cId);
    if (!selected) {
      setFormData((prev) => ({ ...prev, customerId: cId }));
      return;
    }

    const billing = selected.addresses?.find((a: any) => a.addressType === 'BILLING' || a.isDefaultBilling) || selected.addresses?.[0];
    const shipping = selected.addresses?.find((a: any) => a.addressType === 'SHIPPING' || a.isDefaultShipping) || billing;

    const bState = billing?.state || 'Delhi';
    const bStateCode = billing?.stateCode || (bState.toLowerCase().includes('delhi') ? '07' : '07');

    setFormData((prev) => ({
      ...prev,
      customerId: cId,
      placeOfSupply: bState,
      placeOfSupplyStateCode: bStateCode,
      billingAddress: {
        partyName: selected.legalName || selected.tradeName || prev.billingAddress.partyName,
        gstin: selected.gstin || prev.billingAddress.gstin,
        pan: selected.pan || prev.billingAddress.pan,
        addressLine: [billing?.addressLine1, billing?.addressLine2].filter(Boolean).join(', ') || prev.billingAddress.addressLine,
        city: billing?.city || prev.billingAddress.city,
        pincode: billing?.postalCode || (billing as any)?.pincode || prev.billingAddress.pincode,
        state: bState,
        stateCode: bStateCode,
        phone: selected.phone || (selected as any).contactPhone || prev.billingAddress.phone,
        email: selected.email || (selected as any).contactEmail || prev.billingAddress.email,
      },
      deliveryAddress: {
        partyName: selected.legalName || selected.tradeName || prev.deliveryAddress.partyName,
        addressLine: [shipping?.addressLine1, shipping?.addressLine2].filter(Boolean).join(', ') || prev.deliveryAddress.addressLine,
        city: shipping?.city || prev.deliveryAddress.city,
        pincode: shipping?.postalCode || (shipping as any)?.pincode || prev.deliveryAddress.pincode,
        state: shipping?.state || bState,
        stateCode: shipping?.stateCode || bStateCode,
        phone: selected.phone || (selected as any).contactPhone || prev.deliveryAddress.phone,
      },
    }));

    clearFieldError('customerId');
  };

  // Copy Billing Address to Delivery Address
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

  // Import from Quotation
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
      const pan = (q.customer as any)?.pan || '';

      const quoteItems: CreateItem[] = [];
      const currentModels = catalogModels.length > 0 ? catalogModels : getMergedQuotationModels([]);

      const importedScope: PiScope =
        q.items?.[0]?.customSpecsJson?.quotationScope === 'BOARD' ||
        (q.items && q.items.length > 0 && q.items.every((it: any) => it.systemCategory === 'board' || it.unit === 'SQFT' || it.unit === 'SQM' || it.description?.toLowerCase().includes('board')))
          ? 'BOARD'
          : q.items?.[0]?.customSpecsJson?.quotationScope === 'HARDWARE' ||
            (q.items && q.items.length > 0 && q.items.every((it: any) => it.systemCategory === 'hardware' || it.itemType === 'hardware' || it.hsnSac === '8302'))
          ? 'HARDWARE'
          : 'CUBICLE';

      (q.items || []).forEach((it: any) => {
        const qty = Number(it.quantity) || 1;
        const matchedModel = findMatchingCatalogModel(currentModels, {
          productId: it.productId,
          description: it.description || it.itemDescription,
        });

        if (importedScope === 'BOARD' || it.systemCategory === 'board') {
          quoteItems.push({
            itemType: 'cubicle',
            systemCategory: 'board',
            description: it.description || it.itemDescription || '12mm High Pressure Compact Laminate (HPL) Board Sheet',
            hsnSac: it.hsnSac || it.hsnCode || '4823',
            quantity: qty,
            unit: it.unit || 'SQFT',
            rate: Number(it.rate ?? it.unitPrice ?? 0),
            gstRate: Number(it.gstRate || q.gstRate || 18),
            boardType: it.boardType || 'HPL',
            boardThickness: it.boardThickness || '12mm',
            boardColor: it.boardColor || 'D.No. 123 – Oyster White',
            cubicleSize: it.cubicleSize || '1220mm × 2440mm (4ft × 8ft)',
          });
        } else if (importedScope === 'HARDWARE' || it.systemCategory === 'hardware' || it.hsnSac === '8302') {
          quoteItems.push({
            itemType: 'hardware',
            isCustom: true,
            systemCategory: 'hardware',
            description: it.description || it.itemDescription || 'SS 304 Restroom Hardware Fitting',
            hsnSac: it.hsnSac || it.hsnCode || '8302',
            quantity: qty,
            unit: it.unit || 'SET',
            rate: Number(it.rate ?? it.unitPrice ?? 0),
            gstRate: Number(it.gstRate || q.gstRate || 18),
            hardwarePackage: it.hardwarePackage || 'SS 304 Stainless Steel (Satin/Brushed)',
          });
        } else if (matchedModel) {
          const dims = extractModelDimensions(matchedModel);
          const sysCat: 'cubicle' | 'ump' | 'locker' =
            matchedModel.category === 'Urinal Partitions'
              ? 'ump'
              : matchedModel.category === 'Lockers'
              ? 'locker'
              : 'cubicle';
          const cubicleItem: CreateItem = {
            modelId: matchedModel.id,
            itemType: 'cubicle',
            systemCategory: sysCat,
            description: it.description || it.itemDescription || `Pacific ${matchedModel.title} (${matchedModel.category})`,
            hsnSac: it.hsnSac || it.hsnCode || '9403',
            quantity: qty,
            unit: it.unit || 'NOS',
            rate: Number(it.rate ?? it.unitPrice ?? 0),
            gstRate: Number(it.gstRate || q.gstRate || 18),
            boardType: it.boardType || dims.boardType || 'HPL',
            boardThickness: it.boardThickness || dims.boardThickness || '12mm',
            boardColor: it.boardColor || 'D.No. 123 – Oyster White',
            cubicleSize: it.cubicleSize || dims.cubicleSize,
            doorSize: it.doorSize || dims.doorSize,
            overallHeight: it.overallHeight || dims.overallHeight,
            hardwarePackage: it.hardwarePackage || dims.hardwarePackage,
          };
          const modelHwItems: CreateItem[] = extractModelHardwareItems(matchedModel, qty).map((h) => ({
            ...h,
            parentModelId: matchedModel.id,
          }));
          quoteItems.push(cubicleItem, ...modelHwItems);
        } else {
          quoteItems.push({
            itemType: 'cubicle',
            description: it.description || it.itemDescription || 'Pacific Restroom Cubicle System',
            hsnSac: it.hsnSac || it.hsnCode || '9403',
            quantity: qty,
            unit: it.unit || 'NOS',
            rate: Number(it.rate ?? it.unitPrice ?? 0),
            gstRate: Number(it.gstRate || q.gstRate || 18),
            boardType: it.boardType || 'HPL',
            boardThickness: it.boardThickness || '12mm',
            boardColor: it.boardColor || 'D.No. 123 – Oyster White',
            cubicleSize: it.cubicleSize || '1000mm W × 1500mm D',
            doorSize: it.doorSize || '600mm × 1785mm',
            overallHeight: it.overallHeight || '1980mm (incl. 100mm ground clearance)',
            hardwarePackage: it.hardwarePackage || 'SS 304 Stainless Steel (Satin/Brushed)',
          });
        }
      });

      const isDel = isDelhiState(q.recipientAddress, gstin);
      const posState = isDel ? 'Delhi' : (q.recipientAddress?.split(',').pop()?.trim() || 'Delhi');
      const posCode = isDel ? '07' : '07';

      setFormData((prev) => ({
        ...prev,
        piScope: importedScope,
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
    } catch (err: any) {
      alert('Failed to import quotation details.');
    }
  };

  const quotationIdParam = searchParams.get('quotationId');
  useEffect(() => {
    if (quotationIdParam && !loadingLookups && (!formData.quotationId || formData.quotationId !== quotationIdParam)) {
      handleImportQuotation(quotationIdParam);
    }
  }, [quotationIdParam, loadingLookups, formData.quotationId]);

  // Line item handlers
  const handleItemChange = (idx: number, field: keyof CreateItem, val: any) => {
    setFormData((f) => {
      const next = [...f.items];
      next[idx] = { ...next[idx], [field]: val };
      return { ...f, items: next };
    });
  };

  const handleSelectModel = (idx: number, modelId: string) => {
    if (!modelId || modelId === 'custom') {
      handleItemChange(idx, 'modelId', '');
      return;
    }

    const selected = catalogModels.find((m) => m.id === modelId || m.slug === modelId);
    if (!selected) return;

    const dims = extractModelDimensions(selected);
    const hwText = formatModelHardwareInclusions(selected);
    const qty = Number(formData.items[idx]?.quantity) || 1;
    const modelHwItems: CreateItem[] = extractModelHardwareItems(selected, qty).map((h) => ({
      ...h,
      parentModelId: selected.id,
    }));

    setFormData((f) => {
      const current = f.items[idx];
      const previousParentId = current?.modelId;

      const updatedCubicle: CreateItem = {
        ...current,
        modelId: selected.id,
        itemType: 'cubicle',
        systemCategory: 'cubicle',
        description: `Pacific ${selected.title} (${selected.category})`,
        cubicleSize: dims.cubicleSize,
        doorSize: dims.doorSize,
        overallHeight: dims.overallHeight,
        boardThickness: dims.boardThickness,
        boardType: dims.boardType,
        hardwarePackage: dims.hardwarePackage,
      };

      // Filter out auto-generated hardware items previously linked to this model
      const otherItems = f.items.filter((it, i) => {
        if (i === idx) return false;
        if (it.itemType === 'hardware' && !it.isCustom && previousParentId && it.parentModelId === previousParentId) {
          return false;
        }
        return true;
      });

      // Insert updated cubicle and its individual hardware items directly after it
      const before = otherItems.slice(0, idx);
      const after = otherItems.slice(idx);

      return {
        ...f,
        accessoriesText: hwText,
        items: [...before, updatedCubicle, ...modelHwItems, ...after],
      };
    });

    clearFieldError(`item_${idx}_desc`);
  };

  // ── UMP Selection & Field Change Handlers (Optional Add-on) ──
  const handleSelectUmpModel = (modelId: string) => {
    if (!modelId) {
      setFormData((f) => {
        const existingUmp = f.items.find(
          (it) => it.systemCategory === 'ump' || (it.itemType !== 'hardware' && (it.description.toLowerCase().includes('urinal') || it.description.toLowerCase().includes('ump')))
        );
        const prevModelId = existingUmp?.modelId;

        const nextItems = f.items.filter((it) => {
          if (it === existingUmp) return false;
          if (it.systemCategory === 'ump') return false;
          if (it.itemType !== 'hardware' && (it.description.toLowerCase().includes('urinal') || it.description.toLowerCase().includes('ump'))) return false;
          if (it.itemType === 'hardware' && prevModelId && it.parentModelId === prevModelId) return false;
          return true;
        });

        return {
          ...f,
          items: nextItems.length > 0 ? nextItems : INITIAL_FORM.items,
        };
      });
      return;
    }

    const selected = urinalModels.find((m) => m.id === modelId || m.slug === modelId) || catalogModels.find((m) => m.id === modelId);
    if (!selected) return;

    const dims = extractModelDimensions(selected);

    setFormData((f) => {
      const existingUmp = f.items.find(
        (it) => it.systemCategory === 'ump' || (it.itemType !== 'hardware' && (it.description.toLowerCase().includes('urinal') || it.description.toLowerCase().includes('ump')))
      );
      const prevModelId = existingUmp?.modelId;
      const currentQty = existingUmp ? Number(existingUmp.quantity) || 1 : 1;
      const currentRate = existingUmp && existingUmp.rate > 0 ? existingUmp.rate : 4500;

      const updatedUmpItem: CreateItem = {
        modelId: selected.id,
        systemCategory: 'ump',
        itemType: 'cubicle',
        description: `Pacific ${selected.title} (Urinal Partitions)`,
        hsnSac: '9403',
        quantity: currentQty,
        unit: existingUmp?.unit || 'NOS',
        rate: currentRate,
        gstRate: 18,
        boardType: dims.boardType || 'HPL',
        boardThickness: dims.boardThickness || '12mm',
        boardColor: existingUmp?.boardColor || 'D.No. 123 – Oyster White',
        cubicleSize: dims.cubicleSize || '450mm W × 900mm H',
        doorSize: 'N/A',
        overallHeight: dims.overallHeight || '1200mm (affixed 300mm above finished floor)',
        hardwarePackage: dims.hardwarePackage || 'Grade 304 Wall Mount Cantilever Clamps',
      };

      const remainingItems = f.items.filter((it) => {
        if (it === existingUmp) return false;
        if (it.systemCategory === 'ump') return false;
        if (it.itemType !== 'hardware' && (it.description.toLowerCase().includes('urinal') || it.description.toLowerCase().includes('ump'))) return false;
        if (it.itemType === 'hardware' && prevModelId && it.parentModelId === prevModelId) return false;
        return true;
      });

      const refreshedHw: CreateItem[] = extractModelHardwareItems(selected, currentQty).map((h) => ({
        ...h,
        parentModelId: selected.id,
      }));

      return {
        ...f,
        items: [...remainingItems, updatedUmpItem, ...refreshedHw],
      };
    });
  };

  const handleUmpFieldChange = (field: keyof CreateItem, val: any) => {
    setFormData((f) => {
      const existingUmpIdx = f.items.findIndex(
        (it) => it.systemCategory === 'ump' || (it.itemType !== 'hardware' && (it.description.toLowerCase().includes('urinal') || it.description.toLowerCase().includes('ump')))
      );
      if (existingUmpIdx === -1) return f;

      const updatedUmp = { ...f.items[existingUmpIdx], [field]: val };
      const nextItems = [...f.items];
      nextItems[existingUmpIdx] = updatedUmp;

      if (field === 'quantity') {
        const newQty = Number(val) || 1;
        const model = catalogModels.find((m) => m.id === updatedUmp.modelId);
        if (model) {
          const freshHw = extractModelHardwareItems(model, newQty);
          freshHw.forEach((fh) => {
            const hIdx = nextItems.findIndex(
              (it) => it.itemType === 'hardware' && it.parentModelId === updatedUmp.modelId && it.description === fh.description
            );
            if (hIdx !== -1) {
              nextItems[hIdx] = { ...nextItems[hIdx], quantity: fh.quantity };
            }
          });
        }
      }

      return { ...f, items: nextItems };
    });
  };

  // ── Modular Locker Selection & Field Change Handlers (Optional Add-on) ──
  const handleSelectLockerModel = (modelId: string) => {
    if (!modelId) {
      setFormData((f) => {
        const existingLocker = f.items.find(
          (it) => it.systemCategory === 'locker' || (it.itemType !== 'hardware' && it.description.toLowerCase().includes('locker'))
        );
        const prevModelId = existingLocker?.modelId;

        const nextItems = f.items.filter((it) => {
          if (it === existingLocker) return false;
          if (it.systemCategory === 'locker') return false;
          if (it.itemType !== 'hardware' && it.description.toLowerCase().includes('locker')) return false;
          if (it.itemType === 'hardware' && prevModelId && it.parentModelId === prevModelId) return false;
          return true;
        });

        return {
          ...f,
          items: nextItems.length > 0 ? nextItems : INITIAL_FORM.items,
        };
      });
      return;
    }

    const selected = lockerModels.find((m) => m.id === modelId || m.slug === modelId) || catalogModels.find((m) => m.id === modelId);
    if (!selected) return;

    const dims = extractModelDimensions(selected);

    setFormData((f) => {
      const existingLocker = f.items.find(
        (it) => it.systemCategory === 'locker' || (it.itemType !== 'hardware' && it.description.toLowerCase().includes('locker'))
      );
      const prevModelId = existingLocker?.modelId;
      const currentQty = existingLocker ? Number(existingLocker.quantity) || 1 : 1;
      const currentRate = existingLocker && existingLocker.rate > 0 ? existingLocker.rate : 14500;

      const updatedLockerItem: CreateItem = {
        modelId: selected.id,
        systemCategory: 'locker',
        itemType: 'cubicle',
        description: `Pacific ${selected.title} (Lockers)`,
        hsnSac: '9403',
        quantity: currentQty,
        unit: existingLocker?.unit || 'NOS',
        rate: currentRate,
        gstRate: 18,
        boardType: dims.boardType || 'HPL',
        boardThickness: dims.boardThickness || '12mm',
        boardColor: existingLocker?.boardColor || 'D.No. 123 – Oyster White',
        cubicleSize: dims.cubicleSize || '300mm W × 450mm D × 1800mm H',
        doorSize: dims.doorSize || 'Tier Modular Doors as per drawing',
        overallHeight: dims.overallHeight || '1900mm (including 100mm plinth base)',
        hardwarePackage: dims.hardwarePackage || 'Heavy-Duty Uniform Standard Locker Hardware',
      };

      const remainingItems = f.items.filter((it) => {
        if (it === existingLocker) return false;
        if (it.systemCategory === 'locker') return false;
        if (it.itemType !== 'hardware' && it.description.toLowerCase().includes('locker')) return false;
        if (it.itemType === 'hardware' && prevModelId && it.parentModelId === prevModelId) return false;
        return true;
      });

      const refreshedHw: CreateItem[] = extractModelHardwareItems(selected, currentQty).map((h) => ({
        ...h,
        parentModelId: selected.id,
      }));

      return {
        ...f,
        items: [...remainingItems, updatedLockerItem, ...refreshedHw],
      };
    });
  };

  const handleLockerFieldChange = (field: keyof CreateItem, val: any) => {
    setFormData((f) => {
      const existingLockerIdx = f.items.findIndex(
        (it) => it.systemCategory === 'locker' || (it.itemType !== 'hardware' && it.description.toLowerCase().includes('locker'))
      );
      if (existingLockerIdx === -1) return f;

      const updatedLocker = { ...f.items[existingLockerIdx], [field]: val };
      const nextItems = [...f.items];
      nextItems[existingLockerIdx] = updatedLocker;

      if (field === 'quantity') {
        const newQty = Number(val) || 1;
        const model = catalogModels.find((m) => m.id === updatedLocker.modelId);
        if (model) {
          const freshHw = extractModelHardwareItems(model, newQty);
          freshHw.forEach((fh) => {
            const hIdx = nextItems.findIndex(
              (it) => it.itemType === 'hardware' && it.parentModelId === updatedLocker.modelId && it.description === fh.description
            );
            if (hIdx !== -1) {
              nextItems[hIdx] = { ...nextItems[hIdx], quantity: fh.quantity };
            }
          });
        }
      }

      return { ...f, items: nextItems };
    });
  };

  const handleAddBoardItem = () => {
    setFormData((f) => ({
      ...f,
      items: [
        ...f.items,
        {
          itemType: 'cubicle',
          systemCategory: 'board',
          description: '12mm High Pressure Compact Laminate (HPL) Board Sheet',
          hsnSac: '4823',
          unit: 'SQFT',
          quantity: 100,
          rate: 185,
          gstRate: 18,
          boardType: 'HPL',
          boardThickness: '12mm',
          boardColor: 'D.No. 123 – Oyster White',
          cubicleSize: '1220mm × 2440mm (4ft × 8ft)',
        },
      ],
    }));
  };

  const handleAddHardwarePresetItem = (name: string, unit = 'SET', rate = 500, hsnSac = '8302') => {
    setFormData((f) => ({
      ...f,
      items: [
        ...f.items,
        {
          itemType: 'hardware',
          isCustom: true,
          systemCategory: 'hardware',
          description: name,
          hsnSac,
          unit,
          quantity: 1,
          rate,
          gstRate: 18,
        },
      ],
    }));
  };

  const applyPiScopePreset = (scope: PiScope) => {
    if (scope === 'BOARD') {
      setFormData((f) => ({
        ...f,
        piScope: 'BOARD',
        accessoriesText: '• Scope of Supply: Raw material compact laminate / HPL board sheets only.\n• Hardware Accessories: Not included in this invoice scope.',
        items: [
          {
            itemType: 'cubicle',
            systemCategory: 'board',
            description: '12mm High Pressure Compact Laminate (HPL) Board Sheet',
            hsnSac: '4823',
            unit: 'SQFT',
            quantity: 100,
            rate: 185,
            gstRate: 18,
            boardType: 'HPL',
            boardThickness: '12mm',
            boardColor: 'D.No. 123 – Oyster White',
            cubicleSize: '1220mm × 2440mm (4ft × 8ft)',
          },
        ],
      }));
    } else if (scope === 'HARDWARE') {
      setFormData((f) => ({
        ...f,
        piScope: 'HARDWARE',
        accessoriesText: '• Material: Grade 304 Stainless Steel Architectural Restroom Hardware.\n• Fasteners: Grade 304 stainless steel screws and wall anchors included.',
        items: [
          {
            itemType: 'hardware',
            isCustom: true,
            systemCategory: 'hardware',
            description: 'SS 304 Gravity Hinges (Self-Closing Pair with Nylon Cam Mechanism)',
            hsnSac: '8302',
            unit: 'PAIR',
            quantity: 10,
            rate: 450,
            gstRate: 18,
          },
          {
            itemType: 'hardware',
            isCustom: true,
            systemCategory: 'hardware',
            description: 'SS 304 Occupancy Indicator Privacy Lock with Emergency Release',
            hsnSac: '8302',
            unit: 'SET',
            quantity: 5,
            rate: 650,
            gstRate: 18,
          },
          {
            itemType: 'hardware',
            isCustom: true,
            systemCategory: 'hardware',
            description: 'SS 304 Adjustable Supporting Legs (100mm to 150mm Ground Clearance)',
            hsnSac: '8302',
            unit: 'NOS',
            quantity: 10,
            rate: 350,
            gstRate: 18,
          },
          {
            itemType: 'hardware',
            isCustom: true,
            systemCategory: 'hardware',
            description: 'SS 304 Ergonomic Door Pull Handle / Knob',
            hsnSac: '8302',
            unit: 'NOS',
            quantity: 5,
            rate: 180,
            gstRate: 18,
          },
          {
            itemType: 'hardware',
            isCustom: true,
            systemCategory: 'hardware',
            description: 'SS 304 Heavy Duty Coat Hook with Integrated Rubber Buffer Stop',
            hsnSac: '8302',
            unit: 'NOS',
            quantity: 5,
            rate: 120,
            gstRate: 18,
          },
        ],
      }));
    } else {
      setFormData((f) => {
        const stdModel = catalogModels.find((m) => m.slug === 'std-delight' || m.id === 'std-delight') || catalogModels[0];
        const defaultHw = stdModel ? extractModelHardwareItems(stdModel, 1) : [];
        return {
          ...f,
          piScope: 'CUBICLE',
          accessoriesText: DEFAULT_ACCESSORIES_TEXT,
          items: [
            {
              modelId: stdModel?.id || 'std-delight',
              itemType: 'cubicle',
              systemCategory: 'cubicle',
              description: stdModel ? `Pacific ${stdModel.title} (Cubicle)` : 'Pacific Restroom Cubicle System',
              hsnSac: '9403',
              unit: 'NOS',
              quantity: 1,
              rate: 18500,
              gstRate: 18,
              boardType: 'HPL',
              boardThickness: '12mm',
              boardColor: 'D.No. 123 – Oyster White',
              cubicleSize: '1000mm W × 1500mm D',
              doorSize: '600mm × 1785mm',
              overallHeight: '1980mm (incl. 100mm ground clearance)',
              hardwarePackage: 'SS 304 Stainless Steel (Satin/Brushed)',
            },
            ...defaultHw.map((h) => ({ ...h, parentModelId: stdModel?.id || 'std-delight' })),
          ],
        };
      });
    }
  };

  const handleAddCubicleItem = () => {
    const defaultHardware = 'SS 304 Stainless Steel (Satin/Brushed)';
    setFormData((f) => ({
      ...f,
      items: [
        ...f.items,
        {
          itemType: 'cubicle',
          description: '',
          hsnSac: '9403',
          unit: 'NOS',
          quantity: 1,
          rate: 18500,
          gstRate: 18,
          boardType: 'HPL',
          boardThickness: '12mm',
          boardColor: 'D.No. 123 – Oyster White',
          cubicleSize: '1000mm W × 1500mm D',
          doorSize: '600mm × 1785mm',
          overallHeight: '1980mm (incl. 100mm ground clearance)',
          hardwarePackage: defaultHardware,
        },
      ],
    }));
  };

  const handleAddHardwareItem = () => {
    setFormData((f) => ({
      ...f,
      items: [
        ...f.items,
        {
          itemType: 'hardware',
          isCustom: true,
          description: '',
          hsnSac: '8302',
          unit: 'SET',
          quantity: 1,
          rate: 0,
          gstRate: 18,
        },
      ],
    }));
  };

  const handleAddInstallationItem = () => {
    const count = effectiveCubicleCount;
    const rate = effectiveInstallRate;
    setFormData((f) => ({
      ...f,
      items: [
        ...f.items,
        {
          itemType: 'hardware',
          isCustom: true,
          systemCategory: 'hardware',
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

  const handleAddItem = () => {
    if (formData.piScope === 'BOARD') {
      handleAddBoardItem();
    } else if (formData.piScope === 'HARDWARE') {
      handleAddHardwareItem();
    } else {
      handleAddCubicleItem();
    }
  };

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

  // Terms handlers
  const handleAddTerm = () => {
    if (!newTermText.trim()) return;
    setFormData((prev) => ({
      ...prev,
      terms: [...prev.terms, newTermText.trim()],
    }));
    setNewTermText('');
  };

  const handleRemoveTerm = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      terms: prev.terms.filter((_, i) => i !== index),
    }));
  };

  // Math Computations
  const basicPrice = formData.items.reduce(
    (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.rate) || 0),
    0
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

  const freightAmount = Number(formData.freightAmount) || 0;
  const installationCharge = Number(formData.installationCharge) || 0;
  const taxable = basicPrice + freightAmount + installationCharge;

  // Tax calculation
  const gstBreakdown = calculateGstSplit(
    taxable,
    formData.billingAddress.stateCode,
    formData.billingAddress.state,
    false,
    18,
    formData.billingAddress.gstin,
    formData.billingAddress.addressLine
  );
  const grandTotal = gstBreakdown.grandTotal;
  const requiredAdvance = Math.round(grandTotal * (Number(formData.advancePercentage || 50) / 100));

  // Field validation
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    if (!formData.customerId && !formData.billingAddress.partyName.trim()) {
      errs.partyName = 'Billing Party Name or Client selection is required.';
    }

    if (formData.billingAddress.gstin && formData.billingAddress.gstin.trim().length !== 15) {
      errs.gstin = 'GSTIN must be exactly 15 characters (e.g. 07AAAAA0000A1Z5).';
    }

    if (formData.billingAddress.pan && formData.billingAddress.pan.trim().length !== 10) {
      errs.pan = 'PAN must be exactly 10 alphanumeric characters (e.g. ABCDE1234F).';
    }

    if (formData.items.length === 0) {
      errs.items = 'At least one line item is required.';
    } else {
      formData.items.forEach((it, idx) => {
        if (!it.description.trim()) {
          errs[`item_${idx}_desc`] = `Item #${idx + 1} description is required.`;
        }
        if (Number(it.quantity) <= 0) {
          errs[`item_${idx}_qty`] = `Item #${idx + 1} quantity must be greater than 0.`;
        }
        if (Number(it.rate) < 0) {
          errs[`item_${idx}_rate`] = `Item #${idx + 1} rate cannot be negative.`;
        }
      });
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const clearFieldError = (key: string) => {
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const { [key]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!validateForm()) {
      alert('Please fill in all required fields and correct the errors marked in red.');
      return;
    }

    setSubmitting(true);
    try {
      // Build clean structured address lines containing PIN
      const billAddrParts = [
        formData.billingAddress.addressLine,
        formData.billingAddress.city,
        formData.billingAddress.pincode ? `PIN: ${formData.billingAddress.pincode}` : '',
      ].filter(Boolean);
      const billToAddressFormatted = billAddrParts.join(', ');

      const shipAddrParts = [
        formData.deliveryAddress.addressLine,
        formData.deliveryAddress.city,
        formData.deliveryAddress.pincode ? `PIN: ${formData.deliveryAddress.pincode}` : '',
      ].filter(Boolean);
      const shipToAddressFormatted = shipAddrParts.join(', ');

      // Prepare clean terms without legacy hardware inclusions block
      const finalTerms = formData.terms.filter(
        (t) =>
          !t.toLowerCase().includes('hardware accessories') &&
          !t.toLowerCase().includes('standard inclusions')
      );

      // Enrich item descriptions with specifications so they persist to DB, PDF, and Detail views
      const enrichedItems = formData.items.map((it) => {
        let desc = it.description;
        const specParts = [];
        if (it.customModelName) {
          specParts.push(`Model: ${it.customModelName}`);
        }
        if (it.boardType || it.boardThickness) {
          specParts.push(`Board: ${[it.boardType, it.boardThickness].filter(Boolean).join(' ')}`);
        }
        if (it.boardColor) specParts.push(`Color: ${it.boardColor}`);
        if (it.cubicleSize) specParts.push(`Size: ${it.cubicleSize}`);
        if (it.doorSize) specParts.push(`Door: ${it.doorSize}`);
        if (it.overallHeight) specParts.push(`Height: ${it.overallHeight}`);
        if (it.hardwarePackage) specParts.push(`Hardware: ${it.hardwarePackage}`);

        if (specParts.length > 0 && !desc.includes('Board:')) {
          desc = `${desc}\n(${specParts.join(' | ')})`;
        }

        return {
          productId: (it.modelId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(it.modelId)) ? it.modelId : undefined,
          description: desc,
          hsnSac: it.hsnSac || (it.itemType === 'hardware' ? '8302' : '9403'),
          quantity: Number(it.quantity) || 1,
          unit: it.unit || (it.itemType === 'hardware' ? 'SET' : 'NOS'),
          rate: Number(it.rate) || 0,
          gstRate: Number(it.gstRate || 18),
          boardType: it.boardType || undefined,
          boardThickness: it.boardThickness || undefined,
          boardColor: it.boardColor || undefined,
          cubicleSize: it.cubicleSize || undefined,
          doorSize: it.doorSize || undefined,
          overallHeight: it.overallHeight || undefined,
          hardwarePackage: it.hardwarePackage || undefined,
          customModelName: it.customModelName || undefined,
          modelName: it.customModelName || undefined,
        };
      });

      const res = await piApi.create({
        companyProfileId: formData.companyProfileId || companies[0]?.id,
        customerId: formData.customerId || undefined,
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
        installationCharge: Number(formData.installationCharge) || 0,
        installationRatePerCubicle: Number(formData.installationCharge) > 0 ? (formData.installationRatePerCubicle ?? 1000) : undefined,
        installationCubicleCount: Number(formData.installationCharge) > 0 ? (formData.installationCubicleCount || detectedCubicleCount || undefined) : undefined,
        advancePercentage: formData.advancePercentage,
        advanceRequiredAmount: requiredAdvance,
        billTo: {
          partyName: formData.billingAddress.partyName,
          gstin: formData.billingAddress.gstin ? formData.billingAddress.gstin.toUpperCase().trim() : undefined,
          pan: formData.billingAddress.pan ? formData.billingAddress.pan.toUpperCase().trim() : undefined,
          addressLine: billToAddressFormatted,
          state: formData.billingAddress.state,
          stateCode: formData.billingAddress.stateCode,
          phone: formData.billingAddress.phone || undefined,
          email: formData.billingAddress.email || undefined,
        },
        shipTo: {
          partyName: formData.deliveryAddress.partyName || formData.billingAddress.partyName,
          gstin: formData.billingAddress.gstin ? formData.billingAddress.gstin.toUpperCase().trim() : undefined,
          addressLine: shipToAddressFormatted || billToAddressFormatted,
          state: formData.deliveryAddress.state || formData.billingAddress.state,
          stateCode: formData.deliveryAddress.stateCode || formData.billingAddress.stateCode,
          phone: formData.deliveryAddress.phone || formData.billingAddress.phone || undefined,
        },
        items: enrichedItems,
        terms: finalTerms,
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

  const inputCls =
    'w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] transition-colors';
  const labelCls = 'block text-xs font-semibold text-gray-400 mb-1';
  const getInputCls = (key: string) =>
    fieldErrors[key]
      ? 'w-full bg-[#0a0a1a] border border-red-500 rounded-xl p-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-400 transition-colors'
      : inputCls;

  if (loadingLookups) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-[#7FB706] animate-spin mx-auto" />
          <p className="text-gray-400 text-sm">Loading client master and product models...</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-24 max-w-6xl mx-auto">
      {/* ── Top Back Button ────────────────────────────────────── */}
      <div className="py-2">
        <Link
          to="/admin/dashboard/proforma-invoices"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Proforma Invoices
        </Link>
      </div>

      {/* ── Document Flow Timeline (Stage 02) ───────────────────── */}
      <DocumentFlowTimeline
        currentStage={2}
        advanceInfo={{
          grandTotal,
          advanceRequired: requiredAdvance,
          advancePaymentStatus: 'DRAFT',
        }}
      />

      {/* ── Quick Scope & Boilerplate Presets ── */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#7FB706]" /> Quick Presets:
          </span>
          <span className="text-xs text-gray-400">1-click boilerplate configurations</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => applyPiScopePreset('CUBICLE')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg min-h-[36px] transition cursor-pointer flex items-center gap-1.5 ${
              (!formData.piScope || formData.piScope === 'CUBICLE')
                ? 'bg-[#7FB706]/20 text-[#7FB706] border border-[#7FB706]/40'
                : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Standard Cubicle
          </button>
          <button
            type="button"
            onClick={() => applyPiScopePreset('BOARD')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg min-h-[36px] transition cursor-pointer flex items-center gap-1.5 ${
              formData.piScope === 'BOARD'
                ? 'bg-[#7FB706]/20 text-[#7FB706] border border-[#7FB706]/40'
                : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white'
            }`}
          >
            <Package className="w-3.5 h-3.5" /> Board Only (HPL / HDF)
          </button>
          <button
            type="button"
            onClick={() => applyPiScopePreset('HARDWARE')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg min-h-[36px] transition cursor-pointer flex items-center gap-1.5 ${
              formData.piScope === 'HARDWARE'
                ? 'bg-[#7FB706]/20 text-[#7FB706] border border-[#7FB706]/40'
                : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" /> Custom Hardware Only
          </button>
        </div>
      </div>

      {/* ── Card 1: Client Master & Company Profile Selector ────── */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#7FB706]" /> Client Master &amp; Issuing Entity
          </h3>
          {quotations.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Import Quotation:</span>
              <select
                value={selectedQuoteId}
                onChange={(e) => handleImportQuotation(e.target.value)}
                className="bg-[#0a0a1a] border border-[#7FB706]/40 rounded-lg px-2.5 py-1 text-xs text-[#7FB706] font-mono focus:outline-none"
              >
                <option value="">-- Choose Quotation --</option>
                {quotations.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.referenceNumber} - {q.recipientCompany || q.recipientName || 'Proposal'} (₹{Number(q.grandTotal || 0).toLocaleString('en-IN')})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CustomerSearchSelect
            customers={customers}
            selectedCustomerId={formData.customerId}
            onSelectCustomer={(cId) => handleCustomerSelect(cId)}
            error={fieldErrors.customerId}
            label="Customer Party *"
            placeholder="Search party name, email, GST, phone..."
            required
          />

          <div>
            <label className={labelCls}>Issuing Company Profile *</label>
            <select
              value={formData.companyProfileId}
              onChange={(e) => setFormData((prev) => ({ ...prev, companyProfileId: e.target.value }))}
              className={inputCls}
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName || c.legalName} ({c.taxRegime || 'GST'} - {c.entityCode || 'PPS'})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Card 2: Billing & Delivery Addresses (with GST, PAN, PIN) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Billing Address Card */}
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#7FB706]" /> Billing Address (Customer)
            </h3>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#7FB706]/10 text-[#7FB706]">
              Tax Invoice Target
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className={labelCls}>Legal / Entity Name *</label>
              <input
                type="text"
                value={formData.billingAddress.partyName}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    billingAddress: { ...prev.billingAddress, partyName: e.target.value },
                  }));
                  clearFieldError('partyName');
                }}
                placeholder="Customer registered company name"
                className={getInputCls('partyName')}
                required
              />
              {fieldErrors.partyName && (
                <p className="mt-1 text-xs text-red-400">{fieldErrors.partyName}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>GSTIN Number (15 Digits)</label>
                <input
                  type="text"
                  maxLength={15}
                  value={formData.billingAddress.gstin}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    const stateCode = val.length >= 2 && /^\d{2}$/.test(val.slice(0, 2)) ? val.slice(0, 2) : formData.billingAddress.stateCode;
                    const state = (stateCode ? GST_STATE_CODE_MAP[stateCode] : undefined) || (stateCode === '07' ? 'Delhi' : formData.billingAddress.state);
                    setFormData((prev) => ({
                      ...prev,
                      placeOfSupply: state,
                      placeOfSupplyStateCode: stateCode,
                      billingAddress: {
                        ...prev.billingAddress,
                        gstin: val,
                        stateCode,
                        state,
                      },
                    }));
                    clearFieldError('gstin');
                  }}
                  placeholder="e.g. 07AAAAA0000A1Z5"
                  className={getInputCls('gstin') + ' font-mono'}
                />
                {fieldErrors.gstin && (
                  <p className="mt-1 text-xs text-red-400">{fieldErrors.gstin}</p>
                )}
              </div>

              <div>
                <label className={labelCls}>PAN Number (10 Digits)</label>
                <input
                  type="text"
                  maxLength={10}
                  value={formData.billingAddress.pan}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setFormData((prev) => ({
                      ...prev,
                      billingAddress: { ...prev.billingAddress, pan: val },
                    }));
                    clearFieldError('pan');
                  }}
                  placeholder="e.g. ABCDE1234F"
                  className={getInputCls('pan') + ' font-mono'}
                />
                {fieldErrors.pan && (
                  <p className="mt-1 text-xs text-red-400">{fieldErrors.pan}</p>
                )}
              </div>
            </div>

            <div>
              <label className={labelCls}>Address Line (Premises, Street, Area)</label>
              <input
                type="text"
                value={formData.billingAddress.addressLine}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    billingAddress: { ...prev.billingAddress, addressLine: e.target.value },
                  }))
                }
                placeholder="Building No, Industrial Area, Street"
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>City</label>
                <input
                  type="text"
                  value={formData.billingAddress.city}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      billingAddress: { ...prev.billingAddress, city: e.target.value },
                    }))
                  }
                  placeholder="New Delhi"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Pincode</label>
                <input
                  type="text"
                  maxLength={6}
                  value={formData.billingAddress.pincode}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      billingAddress: { ...prev.billingAddress, pincode: e.target.value },
                    }))
                  }
                  placeholder="110020"
                  className={inputCls + ' font-mono'}
                />
              </div>

              <div>
                <label className={labelCls}>State &amp; Code</label>
                <input
                  type="text"
                  value={`${formData.billingAddress.state} (${formData.billingAddress.stateCode})`}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      billingAddress: { ...prev.billingAddress, state: val },
                    }));
                  }}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Billing Phone</label>
                <input
                  type="text"
                  value={formData.billingAddress.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      billingAddress: { ...prev.billingAddress, phone: e.target.value },
                    }))
                  }
                  placeholder="+91 98765 43210"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Billing Email</label>
                <input
                  type="email"
                  value={formData.billingAddress.email}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      billingAddress: { ...prev.billingAddress, email: e.target.value },
                    }))
                  }
                  placeholder="accounts@company.com"
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Delivery Address Card */}
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400" /> Delivery Address (Ship To / Site)
            </h3>
            <button
              type="button"
              onClick={handleCopyBillingToDelivery}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 transition cursor-pointer"
              title="Copy from Billing Address"
            >
              <Copy className="w-3 h-3" /> Same as Billing
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className={labelCls}>Consignee / Site Name</label>
              <input
                type="text"
                value={formData.deliveryAddress.partyName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    deliveryAddress: { ...prev.deliveryAddress, partyName: e.target.value },
                  }))
                }
                placeholder="Site contact or company name"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Delivery / Site Address</label>
              <input
                type="text"
                value={formData.deliveryAddress.addressLine}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    deliveryAddress: { ...prev.deliveryAddress, addressLine: e.target.value },
                  }))
                }
                placeholder="Exact site delivery location"
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>City</label>
                <input
                  type="text"
                  value={formData.deliveryAddress.city}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      deliveryAddress: { ...prev.deliveryAddress, city: e.target.value },
                    }))
                  }
                  placeholder="New Delhi"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Pincode</label>
                <input
                  type="text"
                  maxLength={6}
                  value={formData.deliveryAddress.pincode}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      deliveryAddress: { ...prev.deliveryAddress, pincode: e.target.value },
                    }))
                  }
                  placeholder="110020"
                  className={inputCls + ' font-mono'}
                />
              </div>

              <div>
                <label className={labelCls}>State &amp; Code</label>
                <input
                  type="text"
                  value={`${formData.deliveryAddress.state} (${formData.deliveryAddress.stateCode})`}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      deliveryAddress: { ...prev.deliveryAddress, state: e.target.value },
                    }))
                  }
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Site Contact Phone</label>
              <input
                type="text"
                value={formData.deliveryAddress.phone}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    deliveryAddress: { ...prev.deliveryAddress, phone: e.target.value },
                  }))
                }
                placeholder="+91 98765 43210 (Site In-charge)"
                className={inputCls}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Card 3: Transport & Logistics ──────────────────────── */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/5 pb-2">
          <Truck className="w-4 h-4 text-amber-400" /> Transport, Logistics &amp; PO References
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className={labelCls}>Place of Supply *</label>
            <input
              type="text"
              value={formData.placeOfSupply}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, placeOfSupply: e.target.value }))
              }
              placeholder="Delhi"
              className={inputCls}
              required
            />
          </div>

          <div>
            <label className={labelCls}>Place of Supply State Code *</label>
            <input
              type="text"
              maxLength={2}
              value={formData.placeOfSupplyStateCode}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, placeOfSupplyStateCode: e.target.value }))
              }
              placeholder="07"
              className={inputCls + ' font-mono'}
              required
            />
          </div>

          <div>
            <label className={labelCls}>Mode of Transport</label>
            <select
              value={formData.modeOfTransport}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, modeOfTransport: e.target.value }))
              }
              className={inputCls}
            >
              {['Road', 'Courier', 'Air', 'Self Pickup', 'To Pay'].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Vehicle Number</label>
            <input
              type="text"
              value={formData.vehicleNumber}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, vehicleNumber: e.target.value }))
              }
              placeholder="e.g. DL 01 AB 1234"
              className={inputCls + ' font-mono'}
            />
          </div>

          <div>
            <label className={labelCls}>GR / LR Number</label>
            <input
              type="text"
              value={formData.grLrNumber}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, grLrNumber: e.target.value }))
              }
              placeholder="e.g. LR-987654"
              className={inputCls + ' font-mono'}
            />
          </div>

          <div>
            <label className={labelCls}>Linked PO Number</label>
            <input
              type="text"
              value={formData.linkedPoNumber}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, linkedPoNumber: e.target.value }))
              }
              placeholder="e.g. PO/2026/049"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Linked PO Date</label>
            <input
              type="date"
              value={formData.linkedPoDate}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, linkedPoDate: e.target.value }))
              }
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Freight Amount (₹)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.freightAmount}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  freightAmount: Number(e.target.value) || 0,
                }))
              }
              placeholder="0"
              className={inputCls + ' font-mono'}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/5">
          <div>
            <label className={labelCls}>Advance Required (%)</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                max="100"
                value={formData.advancePercentage}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    advancePercentage: Number(e.target.value) || 0,
                  }))
                }
                className={inputCls + ' font-mono max-w-[140px]'}
              />
              <span className="text-xs text-gray-400">
                Amount: <strong className="text-white font-mono">₹{requiredAdvance.toLocaleString('en-IN')}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-5">
            <input
              type="checkbox"
              id="reverseCharge"
              checked={formData.reverseCharge}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, reverseCharge: e.target.checked }))
              }
              className="w-4 h-4 rounded border-gray-700 text-[#7FB706] focus:ring-[#7FB706]"
            />
            <label htmlFor="reverseCharge" className="text-xs text-gray-300">
              Tax is payable on Reverse Charge basis (RCM)
            </label>
          </div>
        </div>
      </div>

      {/* ── Card 4: Line Items Configuration ───────────────────── */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#7FB706]" /> Line Items &amp; Specifications
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Select cubicle models to auto-generate hardware lists, or create invoices for raw board sheets or custom hardware only.
            </p>
            {fieldErrors.items && (
              <p className="text-xs text-red-400 mt-0.5">{fieldErrors.items}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {formData.piScope === 'BOARD' ? (
              <button
                type="button"
                onClick={handleAddBoardItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-lg text-xs font-bold cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Board Sheet
              </button>
            ) : formData.piScope === 'HARDWARE' ? (
              <button
                type="button"
                onClick={handleAddHardwareItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg text-xs font-bold cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Hardware Item
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleAddCubicleItem}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#7FB706]/10 hover:bg-[#7FB706]/20 text-[#7FB706] rounded-lg text-xs font-bold cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Cubicle Model
                </button>
                <button
                  type="button"
                  onClick={handleAddHardwareItem}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                >
                  <Wrench className="w-3.5 h-3.5" /> Add Custom Hardware
                </button>
              </>
            )}
          </div>
        </div>

        {/* 3-Way Mode / Scope Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 bg-[#0a0a1a] rounded-xl border border-white/10">
          <button
            type="button"
            onClick={() => {
              if (formData.piScope !== 'CUBICLE') {
                if (window.confirm('Switch Proforma Invoice mode to Restroom Cubicle System?')) {
                  applyPiScopePreset('CUBICLE');
                }
              }
            }}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              (!formData.piScope || formData.piScope === 'CUBICLE')
                ? 'bg-[#7FB706] text-black shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-4 h-4" /> Restroom Cubicle System
          </button>
          <button
            type="button"
            onClick={() => {
              if (formData.piScope !== 'BOARD') {
                if (window.confirm('Switch Proforma Invoice mode to Board Only (HPL/HDF)? This will configure items for raw board sheet supply.')) {
                  applyPiScopePreset('BOARD');
                }
              }
            }}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              formData.piScope === 'BOARD'
                ? 'bg-[#7FB706] text-black shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Package className="w-4 h-4" /> Board Only (HPL / HDF)
          </button>
          <button
            type="button"
            onClick={() => {
              if (formData.piScope !== 'HARDWARE') {
                if (window.confirm('Switch Proforma Invoice mode to Custom Hardware Only? This will configure items for hardware fittings supply.')) {
                  applyPiScopePreset('HARDWARE');
                }
              }
            }}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              formData.piScope === 'HARDWARE'
                ? 'bg-[#7FB706] text-black shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Wrench className="w-4 h-4" /> Custom Hardware Only
          </button>
        </div>

        {formData.items.length === 0 && (
          <div className="text-center py-6 text-gray-500 text-sm">
            No line items yet. Click &quot;Add Item&quot; to configure proforma invoice items.
          </div>
        )}

        <div className="space-y-5">
          {formData.piScope === 'BOARD' ? (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-300">
                <span className="flex items-center gap-2 font-medium">
                  <Package className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span><strong>Board Supply Mode Active:</strong> Proforma Invoice for raw compact laminate / HDF sheets only. Cubicle model is not required.</span>
                </span>
                <button
                  type="button"
                  onClick={handleAddBoardItem}
                  className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Board Sheet
                </button>
              </div>

              {formData.items.map((item, idx) => {
                const lineTotal = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
                return (
                  <div key={idx} className="bg-[#0a0a1a] border border-amber-500/30 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-amber-400">Board Item #{idx + 1}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <Package className="w-3 h-3 text-amber-400" /> Raw Board Supply
                        </span>
                      </div>
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-red-400 hover:text-red-300 cursor-pointer transition-colors"
                          title="Remove Board Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-6 space-y-1">
                        <label className={labelCls}>Board Description *</label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => {
                            handleItemChange(idx, 'description', e.target.value);
                            clearFieldError(`item_${idx}_desc`);
                          }}
                          placeholder="e.g. 12mm High Pressure Compact Laminate (HPL) Board Sheet"
                          className={getInputCls(`item_${idx}_desc`)}
                          required
                        />
                        {fieldErrors[`item_${idx}_desc`] && (
                          <p className="mt-1 text-xs text-red-400">{fieldErrors[`item_${idx}_desc`]}</p>
                        )}
                      </div>

                      <div className="sm:col-span-2 space-y-1">
                        <label className={labelCls}>Board Type *</label>
                        <select
                          value={item.boardType || 'HPL'}
                          onChange={(e) => handleItemChange(idx, 'boardType', e.target.value)}
                          className={inputCls}
                        >
                          <option value="HPL">HPL (Compact Laminate)</option>
                          <option value="HDF">HDF (High Density Board)</option>
                          <option value="WOODEN">Wooden Core Panel</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2 space-y-1">
                        <label className={labelCls}>Thickness</label>
                        <input
                          type="text"
                          value={item.boardThickness || ''}
                          onChange={(e) => handleItemChange(idx, 'boardThickness', e.target.value)}
                          placeholder="e.g. 12mm"
                          className={inputCls}
                        />
                        <div className="flex gap-1 pt-0.5">
                          {['12mm', '18mm', '25mm'].map((th) => (
                            <button
                              key={th}
                              type="button"
                              onClick={() => handleItemChange(idx, 'boardThickness', th)}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer"
                            >
                              {th}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="sm:col-span-2 space-y-1">
                        <label className={labelCls}>Color / Shade Code</label>
                        <input
                          type="text"
                          value={item.boardColor || ''}
                          onChange={(e) => handleItemChange(idx, 'boardColor', e.target.value)}
                          placeholder="e.g. D.No. 123 – Oyster White"
                          className={inputCls}
                        />
                      </div>

                      <div className="sm:col-span-4 space-y-1">
                        <label className={labelCls}>Sheet Dimensions / Size</label>
                        <input
                          type="text"
                          value={item.cubicleSize || ''}
                          onChange={(e) => handleItemChange(idx, 'cubicleSize', e.target.value)}
                          placeholder="e.g. 1220mm × 2440mm (4ft × 8ft)"
                          className={inputCls}
                        />
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {[
                            { label: '4ft × 8ft', val: '1220mm × 2440mm (4ft × 8ft)' },
                            { label: '6ft × 6ft', val: '1830mm × 1830mm (6ft × 6ft)' },
                            { label: '6ft × 9ft', val: '1830mm × 2740mm (6ft × 9ft)' },
                          ].map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => handleItemChange(idx, 'cubicleSize', preset.val)}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer"
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="sm:col-span-2 space-y-1">
                        <label className={labelCls}>HSN / SAC</label>
                        <input
                          type="text"
                          value={item.hsnSac || '4823'}
                          onChange={(e) => handleItemChange(idx, 'hsnSac', e.target.value)}
                          className={inputCls + ' font-mono'}
                        />
                      </div>

                      <div className="sm:col-span-2 space-y-1">
                        <label className={labelCls}>Unit</label>
                        <select
                          value={item.unit || 'SQFT'}
                          onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                          className={inputCls}
                        >
                          {['SQFT', 'SQM', 'NOS', 'SHEET', 'LOT'].map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-2 space-y-1">
                        <label className={labelCls}>Quantity *</label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => {
                            handleItemChange(idx, 'quantity', Number(e.target.value) || 0);
                            clearFieldError(`item_${idx}_qty`);
                          }}
                          className={getInputCls(`item_${idx}_qty`)}
                          required
                        />
                        {fieldErrors[`item_${idx}_qty`] && (
                          <p className="mt-1 text-xs text-red-400">{fieldErrors[`item_${idx}_qty`]}</p>
                        )}
                      </div>

                      <div className="sm:col-span-2 space-y-1">
                        <label className={labelCls}>Rate (₹) *</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) => {
                            handleItemChange(idx, 'rate', Number(e.target.value) || 0);
                            clearFieldError(`item_${idx}_rate`);
                          }}
                          className={getInputCls(`item_${idx}_rate`)}
                          required
                        />
                        {fieldErrors[`item_${idx}_rate`] && (
                          <p className="mt-1 text-xs text-red-400">{fieldErrors[`item_${idx}_rate`]}</p>
                        )}
                      </div>
                    </div>

                    <div className="text-right text-xs text-gray-400 font-mono pt-1 border-t border-white/5">
                      Line Total: <span className="font-bold text-white text-sm">
                        ₹ {lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={handleAddBoardItem}
                className="w-full py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-dashed border-amber-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Another Board Line Item
              </button>
            </div>
          ) : formData.piScope === 'HARDWARE' ? (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-cyan-300">
                <span className="flex items-center gap-2 font-medium">
                  <Wrench className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <span><strong>Custom Hardware Only Mode Active:</strong> Proforma Invoice for individual restroom cubicle hardware fittings. Cubicle model is not required.</span>
                </span>
                <button
                  type="button"
                  onClick={handleAddHardwareItem}
                  className="px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Hardware Item
                </button>
              </div>

              {/* Quick Insert Hardware Chips */}
              <div className="flex flex-wrap items-center gap-1.5 p-2.5 rounded-xl bg-[#0a0a1a] border border-white/5">
                <span className="text-[11px] text-gray-400 mr-1 flex items-center gap-1 font-semibold">
                  <Sparkles className="w-3 h-3 text-cyan-400" /> Quick Add:
                </span>
                {[
                  { name: 'SS 304 Gravity Hinges (Pair)', unit: 'PAIR', rate: 450 },
                  { name: 'SS 304 Occupancy Indicator Lock with Release', unit: 'SET', rate: 650 },
                  { name: 'SS 304 Adjustable Supporting Legs (100-150mm)', unit: 'NOS', rate: 350 },
                  { name: 'SS 304 Door Pull Handle / Knob', unit: 'NOS', rate: 180 },
                  { name: 'SS 304 Heavy Duty Coat Hook with Buffer', unit: 'NOS', rate: 120 },
                  { name: 'Continuous Top Headrail Extrusion (Mtr)', unit: 'MTR', rate: 550 },
                  { name: 'SS 304 Wall U-Channels Extrusion (Mtr)', unit: 'MTR', rate: 320 },
                  { name: 'Grade 304 Stainless Fastener & Anchor Pack', unit: 'SET', rate: 250 },
                ].map((chip) => (
                  <button
                    key={chip.name}
                    type="button"
                    onClick={() => handleAddHardwarePresetItem(chip.name, chip.unit, chip.rate)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 transition cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> {chip.name}
                  </button>
                ))}
              </div>

              {formData.items.map((item, idx) => {
                const lineTotal = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
                return (
                  <div key={idx} className="bg-[#0a0a1a] border border-cyan-500/30 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-cyan-400">Hardware Item #{idx + 1}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                          <Wrench className="w-3 h-3 text-cyan-400" /> Custom Hardware Fitting
                        </span>
                      </div>
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-red-400 hover:text-red-300 cursor-pointer transition-colors"
                          title="Remove Hardware Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-5 space-y-1">
                        <label className={labelCls}>Hardware Description / Name *</label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => {
                            handleItemChange(idx, 'description', e.target.value);
                            clearFieldError(`item_${idx}_desc`);
                          }}
                          placeholder="e.g. SS 304 Gravity Hinges (Self-Closing Pair)"
                          className={getInputCls(`item_${idx}_desc`)}
                          required
                        />
                        {fieldErrors[`item_${idx}_desc`] && (
                          <p className="mt-1 text-xs text-red-400">{fieldErrors[`item_${idx}_desc`]}</p>
                        )}
                      </div>

                      <div className="sm:col-span-3 space-y-1">
                        <label className={labelCls}>Material / Finish / Specs</label>
                        <input
                          type="text"
                          value={item.hardwarePackage || ''}
                          onChange={(e) => handleItemChange(idx, 'hardwarePackage', e.target.value)}
                          placeholder="e.g. Grade 304 Stainless Steel (Satin Finish)"
                          className={inputCls}
                        />
                      </div>

                      <div className="sm:col-span-1 space-y-1">
                        <label className={labelCls}>HSN / SAC</label>
                        <input
                          type="text"
                          value={item.hsnSac || '8302'}
                          onChange={(e) => handleItemChange(idx, 'hsnSac', e.target.value)}
                          className={inputCls + ' font-mono text-xs'}
                        />
                      </div>

                      <div className="sm:col-span-1 space-y-1">
                        <label className={labelCls}>Unit</label>
                        <select
                          value={item.unit || 'SET'}
                          onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                          className={inputCls}
                        >
                          {['SET', 'PAIR', 'NOS', 'PCS', 'MTR', 'RMT', 'LOT'].map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-1 space-y-1">
                        <label className={labelCls}>Qty *</label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => {
                            handleItemChange(idx, 'quantity', Number(e.target.value) || 0);
                            clearFieldError(`item_${idx}_qty`);
                          }}
                          className={getInputCls(`item_${idx}_qty`)}
                          required
                        />
                        {fieldErrors[`item_${idx}_qty`] && (
                          <p className="mt-1 text-xs text-red-400">{fieldErrors[`item_${idx}_qty`]}</p>
                        )}
                      </div>

                      <div className="sm:col-span-1 space-y-1">
                        <label className={labelCls}>Rate (₹) *</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) => {
                            handleItemChange(idx, 'rate', Number(e.target.value) || 0);
                            clearFieldError(`item_${idx}_rate`);
                          }}
                          className={getInputCls(`item_${idx}_rate`)}
                          required
                        />
                        {fieldErrors[`item_${idx}_rate`] && (
                          <p className="mt-1 text-xs text-red-400">{fieldErrors[`item_${idx}_rate`]}</p>
                        )}
                      </div>
                    </div>

                    <div className="text-right text-xs text-gray-400 font-mono pt-1 border-t border-white/5">
                      Line Total: <span className="font-bold text-white text-sm">
                        ₹ {lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={handleAddHardwareItem}
                className="w-full py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-dashed border-cyan-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Another Hardware Item
              </button>
            </div>
          ) : (
            (() => {
            const primaryCubicleItem = formData.items.find(
              (it) => it.itemType !== 'hardware' && it.systemCategory !== 'ump' && it.systemCategory !== 'locker'
            ) || formData.items[0];
            const primaryCubicleIdx = primaryCubicleItem ? formData.items.indexOf(primaryCubicleItem) : 0;

            const umpItem = formData.items.find(
              (it) => it.systemCategory === 'ump' || (it.itemType !== 'hardware' && (it.description.toLowerCase().includes('urinal') || it.description.toLowerCase().includes('ump')))
            );

            const lockerItem = formData.items.find(
              (it) => it.systemCategory === 'locker' || (it.itemType !== 'hardware' && it.description.toLowerCase().includes('locker'))
            );

            const additionalCubicleItems = formData.items.filter(
              (it, i) => it.itemType !== 'hardware' && i !== primaryCubicleIdx && it !== umpItem && it !== lockerItem
            );

            const hardwareItems = formData.items.filter((it) => it.itemType === 'hardware');

            return (
              <>
                {/* ── SECTION 1: CUBICLE MODEL SYSTEM (PRIMARY) ── */}
                {primaryCubicleItem && (
                  <div className="bg-[#0a0a1a] border border-[#7FB706]/40 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-[#7FB706]">Item #1 (Primary System)</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#7FB706]/10 text-[#7FB706] border border-[#7FB706]/30 flex items-center gap-1">
                          <Layers className="w-3 h-3 text-[#7FB706]" /> Cubicle Model System
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#7FB706]/20 text-[#7FB706] border border-[#7FB706]/40">
                        Primary System
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-3 space-y-1.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <label className={labelCls}>Cubicle Model Selection &amp; Description (Optional)</label>
                          <span className="text-[11px] text-[#7FB706] font-medium flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Auto-generates hinges, locks, hooks, legs &amp; channels
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <select
                            value={primaryCubicleItem.modelId || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'custom') {
                                handleItemChange(primaryCubicleIdx, 'modelId', '');
                              } else {
                                handleSelectModel(primaryCubicleIdx, val);
                              }
                            }}
                            className="w-full bg-[#161536] border border-[#7FB706]/40 rounded-xl px-3 py-2.5 text-white font-semibold text-xs focus:border-[#7FB706] focus:outline-none"
                          >
                            <option value="">-- Choose Cubicle Model (Optional) --</option>
                            <option value="custom">-- Custom / Manual Specification (No Model) --</option>
                            {cubicleModels.length > 0 && (
                              <optgroup label={`Restroom Cubicles (${cubicleModels.length} Listed)`}>
                                {cubicleModels.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.title}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                          </select>

                          <input
                            type="text"
                            value={primaryCubicleItem.description}
                            onChange={(e) => {
                              handleItemChange(primaryCubicleIdx, 'description', e.target.value);
                              clearFieldError(`item_${primaryCubicleIdx}_desc`);
                            }}
                            placeholder="Cubicle specification or system description"
                            className={getInputCls(`item_${primaryCubicleIdx}_desc`)}
                            required
                          />
                        </div>
                        {fieldErrors[`item_${primaryCubicleIdx}_desc`] && (
                          <p className="mt-1 text-xs text-red-400">{fieldErrors[`item_${primaryCubicleIdx}_desc`]}</p>
                        )}
                      </div>

                      <div>
                        <label className={labelCls}>Unit</label>
                        <select
                          value={primaryCubicleItem.unit}
                          onChange={(e) => handleItemChange(primaryCubicleIdx, 'unit', e.target.value)}
                          className={inputCls}
                        >
                          {['NOS', 'SET', 'SQM', 'MTR', 'RMT', 'LOT'].map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className={labelCls}>Quantity *</label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={primaryCubicleItem.quantity}
                          onChange={(e) => {
                            handleItemChange(primaryCubicleIdx, 'quantity', Number(e.target.value) || 0);
                            clearFieldError(`item_${primaryCubicleIdx}_qty`);
                          }}
                          className={getInputCls(`item_${primaryCubicleIdx}_qty`)}
                          required
                        />
                        {fieldErrors[`item_${primaryCubicleIdx}_qty`] && (
                          <p className="mt-1 text-xs text-red-400">{fieldErrors[`item_${primaryCubicleIdx}_qty`]}</p>
                        )}
                      </div>

                      <div>
                        <label className={labelCls}>Rate (₹) *</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={primaryCubicleItem.rate}
                          onChange={(e) => {
                            handleItemChange(primaryCubicleIdx, 'rate', Number(e.target.value) || 0);
                            clearFieldError(`item_${primaryCubicleIdx}_rate`);
                          }}
                          className={getInputCls(`item_${primaryCubicleIdx}_rate`)}
                          required
                        />
                        {fieldErrors[`item_${primaryCubicleIdx}_rate`] && (
                          <p className="mt-1 text-xs text-red-400">{fieldErrors[`item_${primaryCubicleIdx}_rate`]}</p>
                        )}
                      </div>
                    </div>

                    {/* Cubicle Technical Specifications */}
                    <div className="bg-[#121226]/80 border border-white/5 rounded-xl p-3.5 space-y-3">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>⚙️</span> Cubicle Technical Specifications
                        </span>
                        <span className="text-[11px] text-gray-400">Board type, dimensions &amp; colors</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div>
                          <label className={labelCls}>Board Type *</label>
                          <select
                            value={primaryCubicleItem.boardType || 'HPL'}
                            onChange={(e) => handleItemChange(primaryCubicleIdx, 'boardType', e.target.value)}
                            className={inputCls}
                          >
                            <option value="HPL">HPL (High Pressure Compact Laminate)</option>
                            <option value="HDF">HDF (High Density Fibreboard)</option>
                          </select>
                        </div>

                        <div>
                          <label className={labelCls}>Board Thickness</label>
                          <input
                            type="text"
                            value={primaryCubicleItem.boardThickness || ''}
                            onChange={(e) => handleItemChange(primaryCubicleIdx, 'boardThickness', e.target.value)}
                            placeholder="e.g. 12mm / 18mm"
                            className={inputCls}
                          />
                        </div>

                        <div>
                          <label className={labelCls}>Board Color / Shade</label>
                          <input
                            type="text"
                            value={primaryCubicleItem.boardColor || ''}
                            onChange={(e) => handleItemChange(primaryCubicleIdx, 'boardColor', e.target.value)}
                            placeholder="e.g. D.No. 123 – Oyster White"
                            className={inputCls}
                          />
                        </div>

                        <div>
                          <label className={labelCls}>Cubicle Size</label>
                          <input
                            type="text"
                            value={primaryCubicleItem.cubicleSize || ''}
                            onChange={(e) => handleItemChange(primaryCubicleIdx, 'cubicleSize', e.target.value)}
                            placeholder="e.g. 1000mm W × 1500mm D"
                            className={inputCls}
                          />
                        </div>

                        <div>
                          <label className={labelCls}>Door Size</label>
                          <input
                            type="text"
                            value={primaryCubicleItem.doorSize || ''}
                            onChange={(e) => handleItemChange(primaryCubicleIdx, 'doorSize', e.target.value)}
                            placeholder="e.g. 600mm × 1785mm"
                            className={inputCls}
                          />
                        </div>

                        <div>
                          <label className={labelCls}>Overall Height</label>
                          <input
                            type="text"
                            value={primaryCubicleItem.overallHeight || ''}
                            onChange={(e) => handleItemChange(primaryCubicleIdx, 'overallHeight', e.target.value)}
                            placeholder="e.g. 1980mm (incl. 100mm ground clearance)"
                            className={inputCls}
                          />
                        </div>

                        <div className="sm:col-span-2 lg:col-span-3">
                          <label className={labelCls}>Hardware Package Specification</label>
                          <input
                            type="text"
                            value={primaryCubicleItem.hardwarePackage || ''}
                            onChange={(e) => handleItemChange(primaryCubicleIdx, 'hardwarePackage', e.target.value)}
                            placeholder="e.g. SS 304 Stainless Steel (Satin/Brushed)"
                            className={inputCls}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="text-right text-xs text-gray-400 font-mono pt-1">
                      Line Total: <span className="font-bold text-white text-sm">
                        ₹ {((Number(primaryCubicleItem.quantity) || 0) * (Number(primaryCubicleItem.rate) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}

                {/* ── SECTION 2: URINAL MODESTY PARTITION (UMP) (OPTIONAL) ── */}
                <div className={`rounded-xl p-4 space-y-3 transition-all ${
                  umpItem ? 'bg-[#0c1524] border border-cyan-500/50 shadow-lg shadow-cyan-950/20' : 'bg-[#0c1524]/40 border border-cyan-500/20'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-cyan-400">Optional Section #2</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                        <Layers className="w-3 h-3 text-cyan-400" /> Urinal Modesty Partition (UMP)
                      </span>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                      umpItem ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-gray-800 text-gray-400'
                    }`}>
                      {umpItem ? '✓ Active & Included' : 'Optional / Not Selected'}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <label className={labelCls}>Urinal Partition Model Selection (Optional)</label>
                      <span className="text-[11px] text-cyan-400 font-medium flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Auto-generates Corner L-Clamps, Fasteners &amp; Floor Legs
                      </span>
                    </div>
                    <select
                      value={umpItem?.modelId || ''}
                      onChange={(e) => handleSelectUmpModel(e.target.value)}
                      className="w-full bg-[#161536] border border-cyan-500/40 rounded-xl px-3 py-2.5 text-white font-semibold text-xs focus:border-cyan-400 focus:outline-none"
                    >
                      <option value="">-- No Urinal Partitions Required (Optional) --</option>
                      {urinalModels.length > 0 ? (
                        <optgroup label={`Urinal Modesty Partitions (${urinalModels.length} Listed)`}>
                          {urinalModels.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.title}
                            </option>
                          ))}
                        </optgroup>
                      ) : (
                        <option disabled value="">No Urinal Partition models listed in DB</option>
                      )}
                    </select>
                  </div>

                  {umpItem && (
                    <div className="space-y-3 pt-2 border-t border-cyan-500/20">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className={labelCls}>Unit</label>
                          <select
                            value={umpItem.unit}
                            onChange={(e) => handleUmpFieldChange('unit', e.target.value)}
                            className={inputCls}
                          >
                            {['NOS', 'SET', 'SQM', 'MTR', 'LOT'].map((u) => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className={labelCls}>Quantity *</label>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={umpItem.quantity}
                            onChange={(e) => handleUmpFieldChange('quantity', Number(e.target.value) || 0)}
                            className={inputCls}
                            required
                          />
                        </div>

                        <div>
                          <label className={labelCls}>Rate (₹) *</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={umpItem.rate}
                            onChange={(e) => handleUmpFieldChange('rate', Number(e.target.value) || 0)}
                            className={inputCls}
                            required
                          />
                        </div>
                      </div>

                      {/* UMP Technical Specifications */}
                      <div className="bg-[#121226]/80 border border-white/5 rounded-xl p-3.5 space-y-3">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>⚙️</span> Urinal Partition Technical Specifications
                          </span>
                          <span className="text-[11px] text-cyan-400">Partition dimensions &amp; fixing hardware</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <div>
                            <label className={labelCls}>Board Type *</label>
                            <select
                              value={umpItem.boardType || 'HPL'}
                              onChange={(e) => handleUmpFieldChange('boardType', e.target.value)}
                              className={inputCls}
                            >
                              <option value="HPL">HPL (High Pressure Compact Laminate)</option>
                              <option value="HDF">HDF (High Density Fibreboard)</option>
                            </select>
                          </div>

                          <div>
                            <label className={labelCls}>Board Thickness</label>
                            <input
                              type="text"
                              value={umpItem.boardThickness || ''}
                              onChange={(e) => handleUmpFieldChange('boardThickness', e.target.value)}
                              placeholder="e.g. 12mm / 18mm"
                              className={inputCls}
                            />
                          </div>

                          <div>
                            <label className={labelCls}>Board Color / Shade</label>
                            <input
                              type="text"
                              value={umpItem.boardColor || ''}
                              onChange={(e) => handleUmpFieldChange('boardColor', e.target.value)}
                              placeholder="e.g. D.No. 123 – Oyster White"
                              className={inputCls}
                            />
                          </div>

                          <div>
                            <label className={labelCls}>Partition Size</label>
                            <input
                              type="text"
                              value={umpItem.cubicleSize || ''}
                              onChange={(e) => handleUmpFieldChange('cubicleSize', e.target.value)}
                              placeholder="e.g. 450mm W × 900mm H"
                              className={inputCls}
                            />
                          </div>

                          <div>
                            <label className={labelCls}>Overall Height</label>
                            <input
                              type="text"
                              value={umpItem.overallHeight || ''}
                              onChange={(e) => handleUmpFieldChange('overallHeight', e.target.value)}
                              placeholder="e.g. 1200mm (affixed 300mm above finished floor)"
                              className={inputCls}
                            />
                          </div>

                          <div className="sm:col-span-2 lg:col-span-1">
                            <label className={labelCls}>Hardware Package Specification</label>
                            <input
                              type="text"
                              value={umpItem.hardwarePackage || ''}
                              onChange={(e) => handleUmpFieldChange('hardwarePackage', e.target.value)}
                              placeholder="e.g. Grade 304 Wall Mount Cantilever Clamps"
                              className={inputCls}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-[11px] text-gray-400 italic">
                          HSN: 9403 · Urinal Modesty Partition System (Auto-generates individual hardware below)
                        </span>
                        <div className="font-mono text-xs text-gray-400">
                          Line Total: <span className="font-bold text-cyan-300 text-sm">
                            ₹ {((Number(umpItem.quantity) || 0) * (Number(umpItem.rate) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── SECTION 3: MODULAR LOCKER SYSTEM (OPTIONAL) ── */}
                <div className={`rounded-xl p-4 space-y-3 transition-all ${
                  lockerItem ? 'bg-[#140e2b] border border-purple-500/50 shadow-lg shadow-purple-950/20' : 'bg-[#140e2b]/40 border border-purple-500/20'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-purple-400">Optional Section #3</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                        <Layers className="w-3 h-3 text-purple-400" /> Modular Locker System
                      </span>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                      lockerItem ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'bg-gray-800 text-gray-400'
                    }`}>
                      {lockerItem ? '✓ Active & Included' : 'Optional / Not Selected'}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <label className={labelCls}>Modular Locker Model Selection (Optional)</label>
                      <span className="text-[11px] text-purple-400 font-medium flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Auto-generates Cam Locks, Hinges, Plates &amp; Louvers
                      </span>
                    </div>
                    <select
                      value={lockerItem?.modelId || ''}
                      onChange={(e) => handleSelectLockerModel(e.target.value)}
                      className="w-full bg-[#161536] border border-purple-500/40 rounded-xl px-3 py-2.5 text-white font-semibold text-xs focus:border-purple-400 focus:outline-none"
                    >
                      <option value="">-- No Modular Lockers Required (Optional) --</option>
                      {lockerModels.length > 0 ? (
                        <optgroup label={`Modular Lockers (${lockerModels.length} Listed)`}>
                          {lockerModels.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.title}
                            </option>
                          ))}
                        </optgroup>
                      ) : (
                        <option disabled value="">No Modular Locker models listed in DB</option>
                      )}
                    </select>
                  </div>

                  {lockerItem && (
                    <div className="space-y-3 pt-2 border-t border-purple-500/20">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className={labelCls}>Unit</label>
                          <select
                            value={lockerItem.unit}
                            onChange={(e) => handleLockerFieldChange('unit', e.target.value)}
                            className={inputCls}
                          >
                            {['NOS', 'SET', 'BANK', 'BAY', 'LOT'].map((u) => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className={labelCls}>Quantity *</label>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={lockerItem.quantity}
                            onChange={(e) => handleLockerFieldChange('quantity', Number(e.target.value) || 0)}
                            className={inputCls}
                            required
                          />
                        </div>

                        <div>
                          <label className={labelCls}>Rate (₹) *</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={lockerItem.rate}
                            onChange={(e) => handleLockerFieldChange('rate', Number(e.target.value) || 0)}
                            className={inputCls}
                            required
                          />
                        </div>
                      </div>

                      {/* Locker Technical Specifications */}
                      <div className="bg-[#121226]/80 border border-white/5 rounded-xl p-3.5 space-y-3">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>⚙️</span> Locker Technical Specifications
                          </span>
                          <span className="text-[11px] text-purple-400">Dimensions, door tiers &amp; security locks</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <div>
                            <label className={labelCls}>Board Type *</label>
                            <select
                              value={lockerItem.boardType || 'HPL'}
                              onChange={(e) => handleLockerFieldChange('boardType', e.target.value)}
                              className={inputCls}
                            >
                              <option value="HPL">HPL (High Pressure Compact Laminate)</option>
                              <option value="HDF">HDF (High Density Fibreboard)</option>
                            </select>
                          </div>

                          <div>
                            <label className={labelCls}>Board Thickness</label>
                            <input
                              type="text"
                              value={lockerItem.boardThickness || ''}
                              onChange={(e) => handleLockerFieldChange('boardThickness', e.target.value)}
                              placeholder="e.g. 12mm / 18mm"
                              className={inputCls}
                            />
                          </div>

                          <div>
                            <label className={labelCls}>Board Color / Shade</label>
                            <input
                              type="text"
                              value={lockerItem.boardColor || ''}
                              onChange={(e) => handleLockerFieldChange('boardColor', e.target.value)}
                              placeholder="e.g. D.No. 123 – Oyster White"
                              className={inputCls}
                            />
                          </div>

                          <div>
                            <label className={labelCls}>Locker Dimension</label>
                            <input
                              type="text"
                              value={lockerItem.cubicleSize || ''}
                              onChange={(e) => handleLockerFieldChange('cubicleSize', e.target.value)}
                              placeholder="e.g. 300mm W × 450mm D × 1800mm H"
                              className={inputCls}
                            />
                          </div>

                          <div>
                            <label className={labelCls}>Compartment / Door Size</label>
                            <input
                              type="text"
                              value={lockerItem.doorSize || ''}
                              onChange={(e) => handleLockerFieldChange('doorSize', e.target.value)}
                              placeholder="e.g. Tier Modular Doors as per drawing"
                              className={inputCls}
                            />
                          </div>

                          <div>
                            <label className={labelCls}>Overall Height</label>
                            <input
                              type="text"
                              value={lockerItem.overallHeight || ''}
                              onChange={(e) => handleLockerFieldChange('overallHeight', e.target.value)}
                              placeholder="e.g. 1900mm (including 100mm plinth base)"
                              className={inputCls}
                            />
                          </div>

                          <div className="sm:col-span-2 lg:col-span-3">
                            <label className={labelCls}>Hardware Package Specification</label>
                            <input
                              type="text"
                              value={lockerItem.hardwarePackage || ''}
                              onChange={(e) => handleLockerFieldChange('hardwarePackage', e.target.value)}
                              placeholder="e.g. Master-Keyed Cam Lock, Concealed Pivot Hinges, Number Plates & Plinth Legs"
                              className={inputCls}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-[11px] text-gray-400 italic">
                          HSN: 9403 · Modular Locker System (Auto-generates individual hardware below)
                        </span>
                        <div className="font-mono text-xs text-gray-400">
                          Line Total: <span className="font-bold text-purple-300 text-sm">
                            ₹ {((Number(lockerItem.quantity) || 0) * (Number(lockerItem.rate) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── SECTION 4: ADDITIONAL CUBICLE SYSTEMS (IF ANY) ── */}
                {additionalCubicleItems.map((item, addIdx) => {
                  const realIdx = formData.items.indexOf(item);
                  const lineTotal = (Number(item.quantity) || 0) * (Number(item.rate) || 0);

                  return (
                    <div key={realIdx} className="bg-[#0a0a1a] border border-[#7FB706]/30 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-[#7FB706]">Additional System #{addIdx + 2}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#7FB706]/10 text-[#7FB706] border border-[#7FB706]/30 flex items-center gap-1">
                            <Layers className="w-3 h-3 text-[#7FB706]" /> Cubicle Model System
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(realIdx)}
                          className="p-1 text-red-400 hover:text-red-300 cursor-pointer transition-colors"
                          title="Remove System"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-3 space-y-1.5">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className={labelCls}>
                                  Product Model Name <span className="text-[11px] text-amber-300 font-medium">(Write Manually)</span>
                                </label>
                                <span className="text-[10px] text-amber-300/80">Printed on PI</span>
                              </div>
                              <input
                                type="text"
                                value={item.customModelName ?? (item.modelId && item.modelId !== 'CUSTOM' ? (cubicleModels.find((m) => m.id === item.modelId)?.title || '') : '')}
                                onChange={(e) => {
                                  handleItemChange(realIdx, 'customModelName', e.target.value);
                                  handleItemChange(realIdx, 'modelName', e.target.value);
                                  handleItemChange(realIdx, 'modelId', 'CUSTOM');
                                }}
                                placeholder="e.g. Pacific Classique / Custom Model Name"
                                className={inputCls + ' font-semibold text-white bg-[#0a0a1a] border-amber-500/40 focus:border-amber-400'}
                              />
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className={labelCls}>Description *</label>
                              </div>
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => {
                                  handleItemChange(realIdx, 'description', e.target.value);
                                  clearFieldError(`item_${realIdx}_desc`);
                                }}
                                placeholder="Item description / specification"
                                className={getInputCls(`item_${realIdx}_desc`)}
                                required
                              />
                              {fieldErrors[`item_${realIdx}_desc`] && (
                                <p className="mt-1 text-xs text-red-400">{fieldErrors[`item_${realIdx}_desc`]}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className={labelCls}>Unit</label>
                          <select
                            value={item.unit}
                            onChange={(e) => handleItemChange(realIdx, 'unit', e.target.value)}
                            className={inputCls}
                          >
                            {['NOS', 'SET', 'SQM', 'MTR', 'LOT'].map((u) => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className={labelCls}>Quantity *</label>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(realIdx, 'quantity', Number(e.target.value) || 0)}
                            className={inputCls}
                            required
                          />
                        </div>

                        <div>
                          <label className={labelCls}>Rate (₹) *</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.rate}
                            onChange={(e) => handleItemChange(realIdx, 'rate', Number(e.target.value) || 0)}
                            className={inputCls}
                            required
                          />
                        </div>
                      </div>

                      {/* Technical Specifications (Without Make & Hardware Package) */}
                      <div className="bg-[#121226]/80 border border-white/5 rounded-xl p-3.5 space-y-3">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>⚙️</span> Technical Specifications
                          </span>
                          <span className="text-[11px] text-gray-400">Board type, dimensions &amp; colors</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <div>
                            <label className={labelCls}>Board Type</label>
                            <select
                              value={item.boardType || 'HPL'}
                              onChange={(e) => handleItemChange(realIdx, 'boardType', e.target.value)}
                              className={inputCls}
                            >
                              <option value="HPL">HPL (High Pressure Compact Laminate)</option>
                              <option value="HDF">HDF (High Density Fibreboard)</option>
                            </select>
                          </div>
                          <div>
                            <label className={labelCls}>Board Thickness</label>
                            <input
                              type="text"
                              value={item.boardThickness || ''}
                              onChange={(e) => handleItemChange(realIdx, 'boardThickness', e.target.value)}
                              placeholder="e.g. 12mm / 18mm"
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label className={labelCls}>Board Color</label>
                            <input
                              type="text"
                              value={item.boardColor || ''}
                              onChange={(e) => handleItemChange(realIdx, 'boardColor', e.target.value)}
                              placeholder="e.g. D.No. 123 – Oyster White"
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label className={labelCls}>Size / Dimension</label>
                            <input
                              type="text"
                              value={item.cubicleSize || ''}
                              onChange={(e) => handleItemChange(realIdx, 'cubicleSize', e.target.value)}
                              placeholder="e.g. 1000mm W × 1500mm D"
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label className={labelCls}>Door Size</label>
                            <input
                              type="text"
                              value={item.doorSize || ''}
                              onChange={(e) => handleItemChange(realIdx, 'doorSize', e.target.value)}
                              placeholder="e.g. 600mm × 1785mm"
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label className={labelCls}>Overall Height</label>
                            <input
                              type="text"
                              value={item.overallHeight || ''}
                              onChange={(e) => handleItemChange(realIdx, 'overallHeight', e.target.value)}
                              placeholder="e.g. 1980mm (incl. 100mm clearance)"
                              className={inputCls}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="text-right text-xs text-gray-400 font-mono pt-1">
                        Line Total: <span className="font-bold text-white text-sm">
                          ₹ {lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* ── SECTION 5: ITEMIZED HARDWARE & ACCESSORIES LIST ── */}
                {hardwareItems.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-cyan-400" />
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                          Itemized Hardware Components &amp; Accessories ({hardwareItems.length} items)
                        </h4>
                      </div>
                      <span className="text-[11px] text-gray-400">
                        Individually priced hardware line items (HSN: 8302 / 7610)
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {hardwareItems.map((item) => {
                        const realIdx = formData.items.indexOf(item);
                        const lineTotal = (Number(item.quantity) || 0) * (Number(item.rate) || 0);

                        // Determine hardware parent badge
                        const isCubicleHw = primaryCubicleItem?.modelId && item.parentModelId === primaryCubicleItem.modelId;
                        const isUmpHw = umpItem?.modelId && item.parentModelId === umpItem.modelId;
                        const isLockerHw = lockerItem?.modelId && item.parentModelId === lockerItem.modelId;

                        return (
                          <div key={realIdx} className="bg-[#0b1022] border border-cyan-500/25 rounded-xl p-3.5 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-cyan-400">Item #{realIdx + 1}</span>
                                {isCubicleHw ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#7FB706]/15 text-[#7FB706] border border-[#7FB706]/30 flex items-center gap-1">
                                    <Wrench className="w-3 h-3" /> Cubicle Hardware
                                  </span>
                                ) : isUmpHw ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                                    <Wrench className="w-3 h-3" /> UMP Hardware
                                  </span>
                                ) : isLockerHw ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                                    <Wrench className="w-3 h-3" /> Locker Hardware
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                                    <Wrench className="w-3 h-3" /> Custom Hardware
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(realIdx)}
                                className="p-1 text-red-400 hover:text-red-300 cursor-pointer transition-colors"
                                title="Remove Hardware Item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                              <div className="sm:col-span-5 space-y-1">
                                <label className={labelCls}>Hardware Description / Name *</label>
                                <input
                                  type="text"
                                  value={item.description}
                                  onChange={(e) => {
                                    handleItemChange(realIdx, 'description', e.target.value);
                                    clearFieldError(`item_${realIdx}_desc`);
                                  }}
                                  className={getInputCls(`item_${realIdx}_desc`) + ' text-xs'}
                                  required
                                />
                              </div>

                              <div className="sm:col-span-2 space-y-1">
                                <label className={labelCls}>HSN / SAC</label>
                                <input
                                  type="text"
                                  value={item.hsnSac || '8302'}
                                  onChange={(e) => handleItemChange(realIdx, 'hsnSac', e.target.value)}
                                  className={inputCls + ' font-mono text-xs'}
                                />
                              </div>

                              <div className="sm:col-span-2 space-y-1">
                                <label className={labelCls}>Unit</label>
                                <select
                                  value={item.unit || 'SET'}
                                  onChange={(e) => handleItemChange(realIdx, 'unit', e.target.value)}
                                  className={inputCls + ' text-xs'}
                                >
                                  {['SET', 'PAIR', 'NOS', 'PCS', 'MTR', 'RMT', 'LOT'].map((u) => (
                                    <option key={u} value={u}>{u}</option>
                                  ))}
                                </select>
                              </div>

                              <div className="sm:col-span-1 space-y-1">
                                <label className={labelCls}>Qty *</label>
                                <input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  value={item.quantity}
                                  onChange={(e) => handleItemChange(realIdx, 'quantity', Number(e.target.value) || 0)}
                                  className={getInputCls(`item_${realIdx}_qty`) + ' font-mono text-xs'}
                                  required
                                />
                              </div>

                              <div className="sm:col-span-2 space-y-1">
                                <label className={labelCls}>Rate (₹) *</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.rate}
                                  onChange={(e) => handleItemChange(realIdx, 'rate', Number(e.target.value) || 0)}
                                  className={getInputCls(`item_${realIdx}_rate`) + ' font-mono text-xs font-bold text-cyan-300'}
                                  required
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                              <span className="text-[11px] text-gray-500 italic">
                                HSN: {item.hsnSac || '8302'} · GST: 18%
                              </span>
                              <div className="text-right font-mono text-xs text-gray-400">
                                Line Total: <span className="font-bold text-cyan-300 text-sm">
                                  ₹ {lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            );
          })())}
        </div>
      </div>

      {/* ── Card 6: Commercial Terms & Conditions ──────────────── */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Commercial Terms &amp; Conditions</h3>
          </div>
          <span className="text-xs text-gray-500 font-mono">{formData.terms.length} Clauses</span>
        </div>

        <div className="space-y-2">
          {formData.terms.map((term, idx) => (
            <div key={idx} className="flex items-start gap-3 p-2.5 rounded-xl bg-[#0a0a1a] border border-white/5">
              <span className="text-xs font-mono text-gray-500 mt-1 shrink-0">{idx + 1}.</span>
              <p className="text-xs text-gray-300 flex-1 leading-relaxed">{term}</p>
              <button
                type="button"
                onClick={() => handleRemoveTerm(idx)}
                className="text-gray-500 hover:text-red-400 p-1"
                title="Remove clause"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-2">
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
            placeholder="Add new commercial condition or delivery clause..."
            className={inputCls + ' text-xs'}
          />
          <button
            type="button"
            onClick={handleAddTerm}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold shrink-0 cursor-pointer"
          >
            Add Clause
          </button>
        </div>
      </div>

      {/* ── Card 7: Installation & Freight Pricing Options ──────── */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-[#7FB706]" />
            <h3 className="text-sm font-bold text-white">Commercial Add-ons &amp; Installation Charges</h3>
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Rate (₹ / Cubicle)</label>
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
                className={inputCls}
                placeholder="1000"
              />
              <span className="text-[10px] text-slate-400">Default: ₹ 1,000 / Cubicle</span>
            </div>

            <div>
              <label className={labelCls}>Cubicles (Qty)</label>
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
                className={inputCls}
                placeholder="Number of cubicles"
              />
              <span className="text-[10px] text-slate-400">
                {detectedCubicleCount > 0
                  ? `Auto-detected: ${detectedCubicleCount} Cubicle${detectedCubicleCount === 1 ? '' : 's'}`
                  : '0 Cubicles in item list (Hardware/Board only)'}
              </span>
            </div>

            <div>
              <label className={labelCls}>Total Installation Charge (₹)</label>
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
                className={inputCls}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs px-3 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
            <span>
              📄 <strong>Mentioned on PI Document:</strong> Cubicle Installation Charges{' '}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Freight &amp; Handling Amount (₹)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.freightAmount}
              onChange={(e) => setFormData((f) => ({ ...f, freightAmount: Number(e.target.value) || 0 }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Advance Required (%)</label>
            <select
              value={formData.advancePercentage}
              onChange={(e) => setFormData((f) => ({ ...f, advancePercentage: Number(e.target.value) || 50 }))}
              className={inputCls}
            >
              {[10, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100].map((pct) => (
                <option key={pct} value={pct}>{pct}% Advance Required</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Form Footer: Grand Total & Statutory GST Breakdown Card ── */}
      <div className="bg-[#121226] border border-[#7FB706]/30 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#7FB706]" /> Financial Summary &amp; Statutory GST Breakdown
          </h3>
          <span className="text-xs font-mono text-[#7FB706]">
            Place of Supply: {formData.placeOfSupply} ({formData.placeOfSupplyStateCode})
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div className="p-3 bg-[#0a0a1a] rounded-xl border border-white/5">
            <span className="text-gray-400 block mb-1">Basic Goods</span>
            <span className="text-white font-mono font-bold text-sm">
              ₹ {basicPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-3 bg-[#0a0a1a] rounded-xl border border-white/5">
            <span className="text-gray-400 block mb-1">
              Installation
              {(formData.installationCharge || 0) > 0 && (
                <span className="text-[10px] text-[#7FB706] block font-mono">
                  @₹{effectiveInstallRate}/cubicle
                </span>
              )}
            </span>
            <span className="text-white font-mono font-bold text-sm">
              ₹ {Number(formData.installationCharge || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-3 bg-[#0a0a1a] rounded-xl border border-white/5">
            <span className="text-gray-400 block mb-1">Freight &amp; Handling</span>
            <span className="text-white font-mono font-bold text-sm">
              ₹ {freightAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-3 bg-[#0a0a1a] rounded-xl border border-white/5">
            <span className="text-gray-400 block mb-1">Net Taxable</span>
            <span className="text-white font-mono font-bold text-sm">
              ₹ {taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-3 bg-[#0a0a1a] rounded-xl border border-white/5">
            <span className="text-gray-400 block mb-1">{formData.advancePercentage}% Adv. Required</span>
            <span className="text-amber-400 font-mono font-bold text-sm">
              ₹ {requiredAdvance.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* GST Tax Slabs & Grand Total Banner */}
        <div className="p-3.5 bg-[#0a0a1a] rounded-xl border border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            {gstBreakdown.isDelhi ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">CGST (9%):</span>
                  <span className="text-blue-400 font-mono font-bold">
                    ₹ {gstBreakdown.cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">SGST (9%):</span>
                  <span className="text-blue-400 font-mono font-bold">
                    ₹ {gstBreakdown.sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">IGST (18%):</span>
                <span className="text-purple-400 font-mono font-bold">
                  ₹ {gstBreakdown.igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-sm font-semibold">Grand Total:</span>
            <span className="text-[#7FB706] font-mono font-bold text-lg sm:text-xl">
              ₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* ── Bottom Floating Action Bar ─────────────────────────── */}
      <div className="sticky bottom-4 z-20 bg-[#121226]/95 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-xs sm:text-sm">
          <div className="text-gray-400">
            Grand Total: <span className="font-bold text-[#7FB706] font-mono text-base">₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="text-gray-400 border-l border-white/10 pl-4">
            Required Advance ({formData.advancePercentage}%): <span className="font-bold text-amber-400 font-mono text-base">₹ {requiredAdvance.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold rounded-xl text-sm transition cursor-pointer shadow-lg shadow-[#7FB706]/20 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {submitting ? 'Generating Official PI...' : 'Create Proforma Invoice'}
          </button>
        </div>
      </div>
    </form>
  );
}
