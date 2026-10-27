import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Save, RotateCcw, CheckCircle2, FileText, Plus, Trash2,
  Copy, Eye, Printer, Building2, Globe, Anchor, ShieldCheck, DollarSign,
  Package, Scale, Layers, HelpCircle, AlertCircle, RefreshCw, X, Check,
} from 'lucide-react';
import { exportApi } from '../../api/exportApi';
import { companiesApi } from '../../api/companyApi';
import { productCatalogApi } from '../../api/productCatalogApi';
import { currencyApi } from '../../api/currencyApi';
import RealtimeCurrencyConverter from '../../components/export/RealtimeCurrencyConverter';
import type {
  BusinessParty, ExportCountry, ExportIncoterm, ExportPort, ExportHsCode,
  CompanyProfile, ProductCatalogModel
} from '../../types/admin';

const QUOTATION_STORAGE_KEY = 'pacific_export_quotation_draft_v2';
const RFQ_STORAGE_KEY = 'pacific_export_rfq_draft_v2';

export const EXPORT_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', flag: '🇸🇦' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: '﷼', flag: '🇶🇦' },
  { code: 'OMR', name: 'Omani Rial', symbol: '﷼', flag: '🇴🇲' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'KD', flag: '🇰🇼' },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: 'BD', flag: '🇧🇭' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: '$', flag: '🇸🇬' },
  { code: 'AUD', name: 'Australian Dollar', symbol: '$', flag: '🇦🇺' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: '$', flag: '🇨🇦' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
];

export type ExportScope = 'CUBICLE' | 'BOARD' | 'HARDWARE' | 'CUSTOM';

export interface ExportQuoteItemForm {
  id?: string;
  itemCode?: string;
  systemCategory?: ExportScope;
  description: string;
  hsCodeId?: string;
  quantity: number;
  unit: string;
  unitRate: number;
  totalAmount: number;
  cbm: number;
  grossWeightKg: number;
  netWeightKg: number;
}

export interface ExportQuotationFormData {
  quotationNumber?: string;
  partyId: string;
  companyProfileId: string;
  scope: ExportScope;
  countryId: string;
  incotermId: string;
  portOfLoadingId: string;
  portOfDestinationId: string;
  currency: string;
  exchangeRate: number;
  validityDays: number;
  validUntil: string;
  paymentTerms: string;
  deliveryTerms: string;
  packingTerms: string;
  warrantyTerms: string;
  freightCharges: number;
  insuranceCharges: number;
  otherCharges: number;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'CONVERTED';
  drawingUrl?: string;
  notes: string;
  items: ExportQuoteItemForm[];
}

interface ExportRfqFormData {
  partyId: string;
  countryId: string;
  incotermId: string;
  destinationPortId: string;
  currency: string;
  estimatedValue: number;
  notes: string;
}

// Standard Pacific Export Cubicle & Board Presets
interface ExportProductPreset {
  name: string;
  category: ExportScope;
  unit: string;
  defaultRateUSD: number;
  hsCode: string;
  cbmPerUnit: number;
  grossWeightPerUnit: number;
  netWeightPerUnit: number;
  description: string;
}

const EXPORT_PRODUCT_PRESETS: ExportProductPreset[] = [
  {
    name: 'Pacific Classic 12mm Compact Laminate Restroom Cubicle System',
    category: 'CUBICLE',
    unit: 'SETS',
    defaultRateUSD: 420,
    hsCode: '39259090',
    cbmPerUnit: 0.22,
    grossWeightPerUnit: 82,
    netWeightPerUnit: 78,
    description: `• System: Pacific Classic 12mm Solid Phenolic Compact Laminate (HPL) Restroom Cubicle System.
• Dimensions: Standard compartment 900–1200mm (W) x 1500–1800mm (D) x 1950–2000mm overall height.
• Core: High-density thermosetting resin-impregnated solid core with melamine decorative overlay; Class 1 fire-resistant, 100% waterproof.
• Hardware: Architectural Grade SS 304 stainless steel gravity hinges (self-closing), surface-mount privacy occupancy lock with emergency release, adjustable support legs (100–150mm ground clearance), coat hook with rubber bumper, and top headrail stabilizer.
• Wall Fixing: Anodized aluminium full-height U-channel profiles with tamper-resistant Grade 304 fasteners.`,
  },
  {
    name: 'Pacific Premium 12mm Anti-Fingerprint System (Black Matt SS304)',
    category: 'CUBICLE',
    unit: 'SETS',
    defaultRateUSD: 510,
    hsCode: '39259090',
    cbmPerUnit: 0.22,
    grossWeightPerUnit: 84,
    netWeightPerUnit: 80,
    description: `• System: Pacific Premium Anti-Fingerprint Matt Finish 12mm Solid Phenolic Cubicle System.
• Dimensions: Custom standard cubicle 1000–1200mm (W) x 1500–1800mm (D) x 2050mm overall height.
• Board: Super-matt anti-fingerprint thermal healing HPL surface with antibacterial coating.
• Hardware: Heavy-duty SS 304 with PVD Black Matt finish (gravity hinges, occupancy indicator lock, adjustable legs, coat hook, and black anodized headrail).
• Recommended for: High-end luxury commercial malls, corporate headquarters, and international airports.`,
  },
  {
    name: 'Pacific Heavy-Duty Marine Grade SS316 Cubicle System',
    category: 'CUBICLE',
    unit: 'SETS',
    defaultRateUSD: 580,
    hsCode: '39259090',
    cbmPerUnit: 0.23,
    grossWeightPerUnit: 86,
    netWeightPerUnit: 82,
    description: `• System: Pacific Extreme Heavy-Duty Marine Grade 12mm Compact Laminate System.
• Hardware: Certified Marine Grade SS 316 hardware with superior corrosion resistance against coastal salinity and chlorinated washrooms.
• Fasteners & Extrusions: Grade 316 stainless steel anchors and heavy-gauge box stabilizer headrails.
• Ideal for: Coastal developments, swimming complexes, marine ports, and high-salinity zones.`,
  },
  {
    name: 'Pacific 12mm Compact Laminate Urinal Modesty Partition (UMP)',
    category: 'CUBICLE',
    unit: 'NOS',
    defaultRateUSD: 85,
    hsCode: '39259090',
    cbmPerUnit: 0.04,
    grossWeightPerUnit: 14,
    netWeightPerUnit: 13,
    description: `• Description: Pacific Urinal Modesty Screen (12mm Solid Phenolic Compact Grade Board).
• Dimensions: 450mm (W) x 900–1000mm (H) with rounded safety bullnose edges.
• Mounting: Dual heavy-duty SS 304 wall clamp brackets with stainless steel anchors. Cantilever floating mount for hygienic floor cleaning.`,
  },
  {
    name: 'Pacific 12mm Solid Phenolic HPL Compact Sheets (1220x1830mm / 4ft x 6ft)',
    category: 'BOARD',
    unit: 'SHEETS',
    defaultRateUSD: 110,
    hsCode: '39259090',
    cbmPerUnit: 0.03,
    grossWeightPerUnit: 34,
    netWeightPerUnit: 33,
    description: `• Material: Pacific Compact Grade High Pressure Laminate (HPL) Board, 12mm nominal thickness.
• Size: 1220mm x 1830mm (approx 4ft x 6ft). Density: ≥1400 kg/m³.
• Properties: Resistant to moisture, graffiti, scratching, and boiling water. Tested to EN 438-4 standard.
• Packing: Export fumigated seaworthy wooden pallets with moisture-barrier wrapping.`,
  },
  {
    name: 'Pacific 12mm Solid Phenolic HPL Compact Sheets (1830x1830mm / 6ft x 6ft)',
    category: 'BOARD',
    unit: 'SHEETS',
    defaultRateUSD: 165,
    hsCode: '39259090',
    cbmPerUnit: 0.045,
    grossWeightPerUnit: 51,
    netWeightPerUnit: 50,
    description: `• Material: Pacific Compact Grade High Pressure Laminate (HPL) Board, 12mm nominal thickness.
• Size: 1830mm x 1830mm (approx 6ft x 6ft jumbo dimension). Density: ≥1400 kg/m³.
• Properties: Impact resistant, fire retardant (Class 1), 100% waterproof phenolic core.
• Packing: Heavy-duty ISPM-15 export pallets with protective corrugated sheets and corner buffers.`,
  },
  {
    name: 'Pacific SS 304 Restroom Cubicle Hardware Master Export Kit',
    category: 'HARDWARE',
    unit: 'SETS',
    defaultRateUSD: 65,
    hsCode: '73269099',
    cbmPerUnit: 0.015,
    grossWeightPerUnit: 5.5,
    netWeightPerUnit: 5.0,
    description: `• Master Hardware Kit (Per Cubicle Compartment):
  - 1 Pair x SS 304 Self-Closing Gravity Hinges with Nylon Bush
  - 1 Set x SS 304 Turn-Bolt Privacy Indicator Lock (Red/White with emergency key release)
  - 2 Pcs x SS 304 Adjustable Ground Supporting Legs (100–150mm height)
  - 1 Pc x SS 304 Architectural Door Knob / Pull Handle
  - 1 Pc x SS 304 Coat Hook with integrated Rubber Buffer Door Stop
  - 12 Pcs x SS 304 Corner Angle Clamps & Grade 304 Fasteners`,
  },
];

const INITIAL_QUOTE: ExportQuotationFormData = {
  partyId: '',
  companyProfileId: '',
  scope: 'CUBICLE',
  countryId: '',
  incotermId: '',
  portOfLoadingId: '',
  portOfDestinationId: '',
  currency: 'USD',
  exchangeRate: 85.0,
  validityDays: 30,
  validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  paymentTerms: '30% Advance T/T upon Purchase Order; balance 70% against copy of Bill of Lading (B/L) and shipping documents.',
  deliveryTerms: '3 to 4 weeks from confirmed order, advance payment receipt, and approved fabrication shop drawings.',
  packingTerms: 'Standard seaworthy export-grade fumigated wooden crates and pallets conforming to ISPM-15, with multi-layer bubble wrap, edge protectors, and waterproof plastic stretch wrap.',
  warrantyTerms: 'Ten (10) Years limited manufacturer warranty for solid phenolic compact laminate partitions against moisture delamination; Two (2) Years warranty for Grade SS 304 hardware against manufacturing defects.',
  freightCharges: 0,
  insuranceCharges: 0,
  otherCharges: 0,
  status: 'APPROVED',
  drawingUrl: '',
  notes: 'All prices quoted in US Dollars based on chosen Incoterm. Inspection by SGS / Bureau Veritas welcome prior to container stuffing upon buyer request.',
  items: [
    {
      itemCode: 'EXP-CUB-12MM',
      systemCategory: 'CUBICLE',
      description: EXPORT_PRODUCT_PRESETS[0].description,
      quantity: 50,
      unit: 'SETS',
      unitRate: 420,
      totalAmount: 21000,
      cbm: 11.0,
      grossWeightKg: 4100,
      netWeightKg: 3900,
    },
  ],
};

const INITIAL_RFQ: ExportRfqFormData = {
  partyId: '',
  countryId: '',
  incotermId: '',
  destinationPortId: '',
  currency: 'USD',
  estimatedValue: 25000,
  notes: 'Foreign buyer requires technical price quotation for compact laminate cubicles and hardware.',
};

export default function CreateExportQuotationPage({ readOnly = false }: { readOnly?: boolean }) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const isEditMode = Boolean(id && !searchParams.get('clone'));
  const isCloneMode = Boolean(searchParams.get('clone'));
  const sourceId = searchParams.get('sourceId') || (isCloneMode ? id : null);
  const rfqId = searchParams.get('rfqId');
  const formType = searchParams.get('type') === 'rfq' && !isEditMode ? 'rfq' : 'quotation';

  // Active view tab in quotation builder
  const [activeTab, setActiveTab] = useState<'form' | 'preview'>('form');

  // Lookups
  const [customers, setCustomers] = useState<BusinessParty[]>([]);
  const [countries, setCountries] = useState<ExportCountry[]>([]);
  const [incoterms, setIncoterms] = useState<ExportIncoterm[]>([]);
  const [ports, setPorts] = useState<ExportPort[]>([]);
  const [hsCodes, setHsCodes] = useState<ExportHsCode[]>([]);
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [catalogModels, setCatalogModels] = useState<ProductCatalogModel[]>([]);

  // State
  const [quoteForm, setQuoteForm] = useState<ExportQuotationFormData>(INITIAL_QUOTE);
  const [rfqForm, setRfqForm] = useState<ExportRfqFormData>(INITIAL_RFQ);
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Live Forex Desk State
  const [showForexDesk, setShowForexDesk] = useState<boolean>(false);
  const [isFetchingForexRate, setIsFetchingForexRate] = useState<boolean>(false);

  // Preset Selector Modal
  const [showPresetModal, setShowPresetModal] = useState<boolean>(false);
  const [presetItemIndex, setPresetItemIndex] = useState<number | null>(null);
  const [presetModalTab, setPresetModalTab] = useState<'catalog' | 'presets'>('catalog');

  // Inline "Add Foreign Buyer" Modal
  const [showNewBuyerModal, setShowNewBuyerModal] = useState<boolean>(false);
  const [newBuyerForm, setNewBuyerForm] = useState({
    legalName: '',
    tradeName: '',
    countryId: '',
    email: '',
    phone: '',
    taxNumber: '',
    address: '',
  });
  const [creatingBuyer, setCreatingBuyer] = useState<boolean>(false);

  // Load Lookups
  useEffect(() => {
    let isMounted = true;
    const fetchLookups = async () => {
      try {
        const [cRes, cntRes, incRes, pRes, hsRes, compRes, models] = await Promise.all([
          exportApi.listCustomers({ limit: 150 }).catch(() => ({ data: { success: false, data: null } })),
          exportApi.listCountries().catch(() => ({ data: { success: false, data: [] } })),
          exportApi.listIncoterms().catch(() => ({ data: { success: false, data: [] } })),
          exportApi.listPorts().catch(() => ({ data: { success: false, data: [] } })),
          exportApi.listHsCodes().catch(() => ({ data: { success: false, data: [] } })),
          companiesApi.list().catch(() => ({ data: { success: false, data: [] } })),
          productCatalogApi.listModels(undefined, true).catch(() => []),
        ]);

        if (isMounted) {
          if (cRes.data?.success && cRes.data.data) {
            setCustomers(cRes.data.data.items || (Array.isArray(cRes.data.data) ? cRes.data.data : []));
          }
          if (cntRes.data?.success && cntRes.data.data) setCountries(cntRes.data.data);
          if (incRes.data?.success && incRes.data.data) setIncoterms(incRes.data.data);
          if (pRes.data?.success && pRes.data.data) setPorts(pRes.data.data);
          if (hsRes.data?.success && hsRes.data.data) setHsCodes(hsRes.data.data);
          if (compRes.data?.success && compRes.data.data) setCompanies(compRes.data.data);
          if (Array.isArray(models)) setCatalogModels(models);
        }
      } catch (err) {
        console.error('Error fetching export lookups:', err);
      }
    };
    fetchLookups();

    const handleProductsUpdated = () => {
      productCatalogApi.listModels(undefined, true).then((m) => {
        if (isMounted && Array.isArray(m)) setCatalogModels(m);
      }).catch(() => {});
    };
    window.addEventListener('pacific:products-updated', handleProductsUpdated);
    return () => {
      window.removeEventListener('pacific:products-updated', handleProductsUpdated);
      isMounted = false;
    };
  }, []);

  // Load Existing Quotation (Edit / Clone mode)
  useEffect(() => {
    const loadQuote = async () => {
      const targetId = isEditMode ? id : sourceId;
      if (!targetId) {
        // If neither edit nor clone, check local storage for new draft
        try {
          const cached = localStorage.getItem(QUOTATION_STORAGE_KEY);
          if (cached && !rfqId) {
            const parsed = JSON.parse(cached);
            setQuoteForm((prev) => ({ ...prev, ...parsed }));
          }
        } catch {}
        setLoadingInitial(false);
        return;
      }

      try {
        setLoadingInitial(true);
        const res = await exportApi.getQuotationById(targetId);
        if (res.data?.success && res.data.data) {
          const q = res.data.data;
          setQuoteForm({
            quotationNumber: isEditMode ? q.quotationNumber : undefined,
            partyId: q.partyId || '',
            companyProfileId: q.companyProfileId || '',
            scope: 'CUBICLE',
            countryId: q.countryId || '',
            incotermId: q.incotermId || '',
            portOfLoadingId: q.portOfLoadingId || '',
            portOfDestinationId: q.portOfDestinationId || '',
            currency: q.currency || 'USD',
            exchangeRate: Number(q.exchangeRate) || 85.0,
            validityDays: 30,
            validUntil: q.validUntil ? new Date(q.validUntil).toISOString().split('T')[0] : '',
            paymentTerms: q.paymentTerms || INITIAL_QUOTE.paymentTerms,
            deliveryTerms: q.deliveryTerms || INITIAL_QUOTE.deliveryTerms,
            packingTerms: INITIAL_QUOTE.packingTerms,
            warrantyTerms: INITIAL_QUOTE.warrantyTerms,
            freightCharges: Number(q.freightCharges) || 0,
            insuranceCharges: Number(q.insuranceCharges) || 0,
            otherCharges: Number(q.otherCharges) || 0,
            status: isEditMode ? (q.status as any) : 'APPROVED',
            drawingUrl: '',
            notes: q.notes || '',
            items: (q.items && q.items.length > 0)
              ? q.items.map((it: any) => ({
                  itemCode: it.itemCode || 'EXP-ITEM',
                  systemCategory: 'CUBICLE',
                  description: it.description || '',
                  hsCodeId: it.hsCodeId || '',
                  quantity: Number(it.quantity) || 1,
                  unit: it.unit || 'SETS',
                  unitRate: Number(it.unitRate) || 0,
                  totalAmount: Number(it.totalAmount) || (Number(it.quantity) || 1) * (Number(it.unitRate) || 0),
                  cbm: Number(it.cbm) || 0,
                  grossWeightKg: Number(it.grossWeightKg) || 0,
                  netWeightKg: Number(it.netWeightKg) || 0,
                }))
              : INITIAL_QUOTE.items,
          });
        }
      } catch (err) {
        console.error('Failed to load export quotation for editing', err);
      } finally {
        setLoadingInitial(false);
      }
    };

    // Load RFQ data if rfqId present
    const loadRfq = async () => {
      if (!rfqId) return;
      try {
        setLoadingInitial(true);
        const res = await exportApi.getRfqById(rfqId);
        if (res.data?.success && res.data.data) {
          const r = res.data.data;
          setQuoteForm((prev) => ({
            ...prev,
            partyId: r.partyId || prev.partyId,
            countryId: r.countryId || prev.countryId,
            incotermId: r.incotermId || prev.incotermId,
            portOfDestinationId: r.destinationPortId || prev.portOfDestinationId,
            currency: r.currency || 'USD',
            notes: r.notes ? `Referenced Inbound RFQ ${r.rfqNumber}: ${r.notes}` : prev.notes,
          }));
        }
      } catch (err) {
        console.error('Failed to load RFQ details', err);
      } finally {
        setLoadingInitial(false);
      }
    };

    if (rfqId) {
      loadRfq();
    } else {
      loadQuote();
    }
  }, [id, sourceId, isEditMode, isCloneMode, rfqId]);

  // Auto-save Quote Draft to Local Storage (only for new creations)
  useEffect(() => {
    if (!isEditMode && formType === 'quotation') {
      try {
        localStorage.setItem(QUOTATION_STORAGE_KEY, JSON.stringify(quoteForm));
        setLastSavedTime(
          new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        );
      } catch {}
    }
  }, [quoteForm, isEditMode, formType]);

  // Calculations
  const calculatedSubtotal = useMemo(() => {
    return quoteForm.items.reduce(
      (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitRate) || 0),
      0
    );
  }, [quoteForm.items]);

  const calculatedTotalAmount = useMemo(() => {
    return (
      calculatedSubtotal +
      (Number(quoteForm.freightCharges) || 0) +
      (Number(quoteForm.insuranceCharges) || 0) +
      (Number(quoteForm.otherCharges) || 0)
    );
  }, [calculatedSubtotal, quoteForm.freightCharges, quoteForm.insuranceCharges, quoteForm.otherCharges]);

  const calculatedTotalCbm = useMemo(() => {
    return quoteForm.items.reduce((sum, it) => sum + (Number(it.cbm) || 0), 0);
  }, [quoteForm.items]);

  const calculatedTotalGrossWeight = useMemo(() => {
    return quoteForm.items.reduce((sum, it) => sum + (Number(it.grossWeightKg) || 0), 0);
  }, [quoteForm.items]);

  const calculatedTotalNetWeight = useMemo(() => {
    return quoteForm.items.reduce((sum, it) => sum + (Number(it.netWeightKg) || 0), 0);
  }, [quoteForm.items]);

  const totalInInr = useMemo(() => {
    return calculatedTotalAmount * (Number(quoteForm.exchangeRate) || 1);
  }, [calculatedTotalAmount, quoteForm.exchangeRate]);

  // Handle party change to auto-fill country & port
  const handlePartyChange = (partyId: string) => {
    const selected = customers.find((c) => c.id === partyId);
    let nextCountryId = quoteForm.countryId;
    let nextPortId = quoteForm.portOfDestinationId;

    if (selected) {
      if (selected.exportCustomerProfile?.countryId) {
        nextCountryId = selected.exportCustomerProfile.countryId;
      }
      if (selected.exportCustomerProfile?.defaultDestinationPortId) {
        nextPortId = selected.exportCustomerProfile.defaultDestinationPortId;
      }
    }

    setQuoteForm({
      ...quoteForm,
      partyId,
      countryId: nextCountryId,
      portOfDestinationId: nextPortId,
    });
  };

  // Sync live rate from ExchangeRate-API
  const handleSyncLiveRate = useCallback(async (curr?: string) => {
    const targetCurr = curr || quoteForm.currency;
    if (!targetCurr || targetCurr === 'INR') {
      setQuoteForm((prev) => ({ ...prev, exchangeRate: 1 }));
      return;
    }
    setIsFetchingForexRate(true);
    try {
      const rate = await currencyApi.getPairRate(targetCurr, 'INR');
      if (rate && !isNaN(rate)) {
        setQuoteForm((prev) => ({ ...prev, exchangeRate: Math.round(rate * 10000) / 10000 }));
      }
    } catch (err) {
      console.warn('Failed to fetch live forex rate:', err);
    } finally {
      setIsFetchingForexRate(false);
    }
  }, [quoteForm.currency]);

  // Handle currency selection change with auto live rate lookup
  const handleCurrencyChange = useCallback((newCurr: string) => {
    setQuoteForm((prev) => ({ ...prev, currency: newCurr }));
    handleSyncLiveRate(newCurr);
  }, [handleSyncLiveRate]);

  // Fetch live exchange rate on new draft initialization
  useEffect(() => {
    if (!isEditMode && !sourceId && quoteForm.currency && quoteForm.currency !== 'INR') {
      handleSyncLiveRate(quoteForm.currency);
    }
  }, []);

  // Set validity days and auto-calculate validUntil
  const handleSetValidityDays = (days: number) => {
    const futureDate = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];
    setQuoteForm({
      ...quoteForm,
      validityDays: days,
      validUntil: futureDate,
    });
  };

  // Item Handlers
  const handleItemChange = (index: number, field: keyof ExportQuoteItemForm, value: any) => {
    const updated = [...quoteForm.items];
    const item = { ...updated[index], [field]: value };
    if (field === 'quantity' || field === 'unitRate') {
      const q = field === 'quantity' ? Number(value) || 0 : Number(item.quantity) || 0;
      const r = field === 'unitRate' ? Number(value) || 0 : Number(item.unitRate) || 0;
      item.totalAmount = q * r;
    }
    updated[index] = item;
    setQuoteForm({ ...quoteForm, items: updated });
  };

  const handleAddItem = (preset?: ExportProductPreset) => {
    const newItem: ExportQuoteItemForm = preset
      ? {
          itemCode: preset.category === 'CUBICLE' ? 'EXP-CUB-12MM' : preset.category === 'BOARD' ? 'EXP-HPL-BRD' : 'EXP-HDW-KIT',
          systemCategory: preset.category,
          description: preset.description,
          hsCodeId: hsCodes.find((h) => h.hsCode.replace(/\./g, '') === preset.hsCode.replace(/\./g, ''))?.id || '',
          quantity: preset.category === 'BOARD' ? 100 : 25,
          unit: preset.unit,
          unitRate: preset.defaultRateUSD,
          totalAmount: (preset.category === 'BOARD' ? 100 : 25) * preset.defaultRateUSD,
          cbm: Number(((preset.category === 'BOARD' ? 100 : 25) * preset.cbmPerUnit).toFixed(3)),
          grossWeightKg: Math.round((preset.category === 'BOARD' ? 100 : 25) * preset.grossWeightPerUnit),
          netWeightKg: Math.round((preset.category === 'BOARD' ? 100 : 25) * preset.netWeightPerUnit),
        }
      : {
          itemCode: 'EXP-ITEM',
          systemCategory: 'CUBICLE',
          description: 'Pacific Restroom Cubicle System (12mm Solid Phenolic HPL)',
          hsCodeId: '',
          quantity: 1,
          unit: 'SETS',
          unitRate: 400,
          totalAmount: 400,
          cbm: 0.22,
          grossWeightKg: 82,
          netWeightKg: 78,
        };

    setQuoteForm({
      ...quoteForm,
      items: [...quoteForm.items, newItem],
    });
  };

  const handleApplyPresetToItem = (preset: ExportProductPreset) => {
    if (presetItemIndex === null) {
      handleAddItem(preset);
      setShowPresetModal(false);
      return;
    }
    const updated = [...quoteForm.items];
    const existingQty = updated[presetItemIndex]?.quantity || 1;
    updated[presetItemIndex] = {
      ...updated[presetItemIndex],
      itemCode: preset.category === 'CUBICLE' ? 'EXP-CUB-12MM' : preset.category === 'BOARD' ? 'EXP-HPL-BRD' : 'EXP-HDW-KIT',
      systemCategory: preset.category,
      description: preset.description,
      hsCodeId: hsCodes.find((h) => h.hsCode.replace(/\./g, '') === preset.hsCode.replace(/\./g, ''))?.id || '',
      unit: preset.unit,
      unitRate: preset.defaultRateUSD,
      totalAmount: existingQty * preset.defaultRateUSD,
      cbm: Number((existingQty * preset.cbmPerUnit).toFixed(3)),
      grossWeightKg: Math.round(existingQty * preset.grossWeightPerUnit),
      netWeightKg: Math.round(existingQty * preset.netWeightPerUnit),
    };
    setQuoteForm({ ...quoteForm, items: updated });
    setShowPresetModal(false);
    setPresetItemIndex(null);
  };

  const handleApplyCatalogModelToItem = (model: ProductCatalogModel, targetIndex: number | null) => {
    const isLocker = model.category === 'Lockers';
    const isUmp = model.category === 'Urinal Partitions';
    const isKid = model.category === 'Kids Toilet';

    const categoryPrefix = isLocker ? 'EXP-LCK' : isUmp ? 'EXP-UMP' : isKid ? 'EXP-KID' : 'EXP-CUB';
    const systemCategory: 'CUBICLE' | 'BOARD' | 'HARDWARE' = 'CUBICLE';
    const unit = isUmp ? 'NOS' : 'SETS';
    const defaultRate = isUmp ? 95 : isLocker ? 320 : 450;
    const cbmPerUnit = isUmp ? 0.05 : 0.22;
    const grossWeightPerUnit = isUmp ? 15 : 84;
    const netWeightPerUnit = isUmp ? 14 : 80;

    const specLines: string[] = [];
    specLines.push(`• System: Pacific ${model.title} (${model.category})`);
    if (model.subtitle) specLines.push(`• Configuration: ${model.subtitle}`);
    if (model.description) specLines.push(`• Description: ${model.description}`);
    if (model.specifications && model.specifications.length > 0) {
      const publicSpecs = model.specifications.filter((s) => !s.label.startsWith('__'));
      publicSpecs.forEach((s) => specLines.push(`• ${s.label}: ${s.value}`));
    }
    if (model.features && model.features.length > 0) {
      specLines.push(`• Standard Features: ${model.features.slice(0, 4).join(', ')}`);
    }

    const techDescription = specLines.join('\n');
    const itemCode = `${categoryPrefix}-${model.slug.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)}`;

    if (targetIndex === null) {
      const qty = 25;
      const newItem: ExportQuoteItemForm = {
        itemCode,
        systemCategory,
        description: techDescription,
        hsCodeId: hsCodes.find((h) => h.hsCode.replace(/\./g, '').startsWith('3925'))?.id || '',
        quantity: qty,
        unit,
        unitRate: defaultRate,
        totalAmount: qty * defaultRate,
        cbm: Number((qty * cbmPerUnit).toFixed(3)),
        grossWeightKg: Math.round(qty * grossWeightPerUnit),
        netWeightKg: Math.round(qty * netWeightPerUnit),
      };
      setQuoteForm({
        ...quoteForm,
        items: [...quoteForm.items, newItem],
      });
      setShowPresetModal(false);
      setPresetItemIndex(null);
      return;
    }

    const updated = [...quoteForm.items];
    const existingQty = updated[targetIndex]?.quantity || 1;
    updated[targetIndex] = {
      ...updated[targetIndex],
      itemCode,
      systemCategory,
      description: techDescription,
      hsCodeId: updated[targetIndex]?.hsCodeId || hsCodes.find((h) => h.hsCode.replace(/\./g, '').startsWith('3925'))?.id || '',
      unit,
      unitRate: updated[targetIndex]?.unitRate || defaultRate,
      totalAmount: existingQty * (updated[targetIndex]?.unitRate || defaultRate),
      cbm: Number((existingQty * cbmPerUnit).toFixed(3)),
      grossWeightKg: Math.round(existingQty * grossWeightPerUnit),
      netWeightKg: Math.round(existingQty * netWeightPerUnit),
    };
    setQuoteForm({ ...quoteForm, items: updated });
    setShowPresetModal(false);
    setPresetItemIndex(null);
  };

  const handleDuplicateItem = (index: number) => {
    const itemToClone = { ...quoteForm.items[index] };
    const updated = [...quoteForm.items];
    updated.splice(index + 1, 0, itemToClone);
    setQuoteForm({ ...quoteForm, items: updated });
  };

  const handleRemoveItem = (index: number) => {
    if (quoteForm.items.length <= 1) {
      alert('At least one item is required in the quotation.');
      return;
    }
    const updated = [...quoteForm.items];
    updated.splice(index, 1);
    setQuoteForm({ ...quoteForm, items: updated });
  };

  const handleResetDraft = () => {
    if (window.confirm('Reset this quotation draft? All unsaved inputs will be cleared.')) {
      localStorage.removeItem(QUOTATION_STORAGE_KEY);
      setQuoteForm(INITIAL_QUOTE);
    }
  };

  // Submit Quotation (Create or Update)
  const handleSubmitQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteForm.partyId) {
      alert('Please select a Foreign Buyer / Customer.');
      return;
    }
    if (quoteForm.items.length === 0) {
      alert('Please add at least one line item.');
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        partyId: quoteForm.partyId,
        companyProfileId: quoteForm.companyProfileId || null,
        countryId: quoteForm.countryId || null,
        incotermId: quoteForm.incotermId || null,
        portOfLoadingId: quoteForm.portOfLoadingId || null,
        portOfDestinationId: quoteForm.portOfDestinationId || null,
        currency: quoteForm.currency || 'USD',
        exchangeRate: Number(quoteForm.exchangeRate) || 1,
        validUntil: quoteForm.validUntil || null,
        paymentTerms: quoteForm.paymentTerms || null,
        deliveryTerms: quoteForm.deliveryTerms || null,
        freightCharges: Number(quoteForm.freightCharges) || 0,
        insuranceCharges: Number(quoteForm.insuranceCharges) || 0,
        otherCharges: Number(quoteForm.otherCharges) || 0,
        subtotal: calculatedSubtotal,
        fobValue: calculatedSubtotal,
        totalAmount: calculatedTotalAmount,
        status: quoteForm.status || 'APPROVED',
        notes: quoteForm.notes
          ? `${quoteForm.notes}\n\n[Export Packing]: ${quoteForm.packingTerms}\n[Warranty]: ${quoteForm.warrantyTerms}`
          : `[Export Packing]: ${quoteForm.packingTerms}\n[Warranty]: ${quoteForm.warrantyTerms}`,
        items: quoteForm.items.map((it) => ({
          itemCode: it.itemCode || 'EXP-ITEM',
          description: it.description,
          hsCodeId: it.hsCodeId || null,
          quantity: Number(it.quantity) || 1,
          unit: it.unit || 'SETS',
          unitRate: Number(it.unitRate) || 0,
          totalAmount: (Number(it.quantity) || 1) * (Number(it.unitRate) || 0),
          cbm: Number(it.cbm) || 0,
          grossWeightKg: Number(it.grossWeightKg) || 0,
          netWeightKg: Number(it.netWeightKg) || 0,
        })),
      };

      if (isEditMode && id) {
        const res = await exportApi.updateQuotation(id, payload);
        if (res.data?.success) {
          alert(`Quotation ${res.data.data?.quotationNumber || ''} updated successfully!`);
          navigate('/admin/dashboard/export/quotations');
        }
      } else {
        const res = await exportApi.createQuotation(payload);
        if (res.data?.success) {
          localStorage.removeItem(QUOTATION_STORAGE_KEY);
          alert(`Created Export Quotation ${res.data.data?.quotationNumber || ''} successfully!`);
          navigate('/admin/dashboard/export/quotations');
        }
      }
    } catch (err: any) {
      console.error('Failed to save export quotation:', err);
      alert(
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to save export quotation'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Inbound RFQ
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
        localStorage.removeItem(RFQ_STORAGE_KEY);
        alert('Created RFQ successfully!');
        navigate('/admin/dashboard/export/quotations');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data?.error || 'Failed to record RFQ');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Inline "Add Foreign Buyer" Modal Handler
  const handleSaveNewBuyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBuyerForm.legalName) {
      alert('Company Legal Name is required');
      return;
    }
    try {
      setCreatingBuyer(true);
      const res = await exportApi.createCustomer({
        partyType: 'CUSTOMER',
        legalName: newBuyerForm.legalName,
        tradeName: newBuyerForm.tradeName || newBuyerForm.legalName,
        email: newBuyerForm.email || undefined,
        phone: newBuyerForm.phone || undefined,
        taxNumber: newBuyerForm.taxNumber || undefined,
        countryId: newBuyerForm.countryId || undefined,
        notes: newBuyerForm.address || undefined,
      });

      if (res.data?.success && res.data.data) {
        const created = res.data.data;
        setCustomers((prev) => [created, ...prev]);
        setQuoteForm((prev) => ({
          ...prev,
          partyId: created.id,
          countryId: newBuyerForm.countryId || prev.countryId,
        }));
        setShowNewBuyerModal(false);
        setNewBuyerForm({
          legalName: '',
          tradeName: '',
          countryId: '',
          email: '',
          phone: '',
          taxNumber: '',
          address: '',
        });
        alert(`Foreign buyer "${created.legalName}" added and selected!`);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create foreign buyer');
    } finally {
      setCreatingBuyer(false);
    }
  };

  const selectedBuyer = useMemo(() => {
    return customers.find((c) => c.id === quoteForm.partyId);
  }, [customers, quoteForm.partyId]);

  const selectedCompany = useMemo(() => {
    return companies.find((c) => c.id === quoteForm.companyProfileId) || companies[0];
  }, [companies, quoteForm.companyProfileId]);

  const selectedCountry = useMemo(() => {
    return countries.find((c) => c.id === quoteForm.countryId);
  }, [countries, quoteForm.countryId]);

  const selectedIncoterm = useMemo(() => {
    return incoterms.find((i) => i.id === quoteForm.incotermId);
  }, [incoterms, quoteForm.incotermId]);

  const selectedPortOfLoading = useMemo(() => {
    return ports.find((p) => p.id === quoteForm.portOfLoadingId);
  }, [ports, quoteForm.portOfLoadingId]);

  const selectedPortOfDestination = useMemo(() => {
    return ports.find((p) => p.id === quoteForm.portOfDestinationId);
  }, [ports, quoteForm.portOfDestinationId]);

  if (loadingInitial) {
    return (
      <div className="p-12 text-center text-gray-400 max-w-5xl mx-auto space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#7FB706]" />
        <p className="text-sm">Loading quotation builder &amp; catalog lookups...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-28 px-3 sm:px-6 text-gray-200">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-[#0f0e26] via-[#070714] to-[#0f0e26] border border-white/10 p-4 sm:p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/dashboard/export/quotations"
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition flex items-center justify-center min-h-[44px] min-w-[44px]"
            title="Back to Export Quotations"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <FileText className="w-6 h-6 text-[#7FB706]" />
                {isEditMode
                  ? `Edit Export Quotation ${quoteForm.quotationNumber ? `(${quoteForm.quotationNumber})` : ''}`
                  : isCloneMode
                  ? 'Clone Export Quotation to New Draft'
                  : rfqId
                  ? 'Convert RFQ to Official Quotation'
                  : formType === 'quotation'
                  ? 'New Export Quotation'
                  : 'Record Inbound RFQ'}
              </h1>
              {quoteForm.status && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#7FB706]/10 text-[#7FB706] border border-[#7FB706]/20">
                  {quoteForm.status}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
              Multi-Currency Proformas, Incoterms 2020, Sea/Air Freight, HS Classification &amp; CBM Costing
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isEditMode && formType === 'quotation' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs">
              <Save className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Auto-Saved</span>
              {lastSavedTime && <span className="text-[11px] opacity-80">({lastSavedTime})</span>}
            </div>
          )}
          {!isEditMode && formType === 'quotation' && (
            <button
              type="button"
              onClick={handleResetDraft}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 min-h-[40px] transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Draft</span>
            </button>
          )}

          {/* Toggle between Form & Live Vector Preview */}
          <div className="flex bg-white/5 rounded-xl p-1 border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('form')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                activeTab === 'form' ? 'bg-[#7FB706] text-[#030213]' : 'text-gray-400 hover:text-white'
              }`}
            >
              Form
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                activeTab === 'preview' ? 'bg-[#7FB706] text-[#030213]' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" /> A4 Preview
            </button>
          </div>
        </div>
      </div>

      {/* Mode Switcher (Quotation vs RFQ) - only when creating new */}
      {!isEditMode && !rfqId && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSearchParams({ type: 'quotation' })}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              formType === 'quotation'
                ? 'bg-[#7FB706] text-[#030213] shadow-lg shadow-[#7FB706]/20'
                : 'bg-[#0f0e26] text-gray-400 hover:text-white border border-white/5'
            }`}
          >
            Export Quotation Builder
          </button>
          <button
            type="button"
            onClick={() => setSearchParams({ type: 'rfq' })}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              formType === 'rfq'
                ? 'bg-[#7FB706] text-[#030213] shadow-lg shadow-[#7FB706]/20'
                : 'bg-[#0f0e26] text-gray-400 hover:text-white border border-white/5'
            }`}
          >
            Record Inbound Foreign RFQ
          </button>
        </div>
      )}

      {/* FORM TAB */}
      {activeTab === 'form' ? (
        formType === 'quotation' ? (
          <form onSubmit={handleSubmitQuotation} className="space-y-6">
            {/* Section 1: Issuing Company & Foreign Buyer */}
            <div className="bg-[#0f0e26]/80 border border-white/10 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#7FB706]" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    1. Issuing Entity &amp; Foreign Buyer
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewBuyerModal(true)}
                  className="px-2.5 py-1 rounded-lg bg-[#7FB706]/10 text-[#7FB706] hover:bg-[#7FB706] hover:text-[#030213] text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Foreign Buyer
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Issuing Company Profile */}
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">
                    Exporting Entity / Branch Letterhead *
                  </label>
                  <select
                    value={quoteForm.companyProfileId}
                    onChange={(e) => setQuoteForm({ ...quoteForm, companyProfileId: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#7FB706] transition min-h-[44px]"
                  >
                    <option value="">Default: Pacific Products &amp; Solutions (Delhi HQ)</option>
                    {companies.map((comp) => (
                      <option key={comp.id} value={comp.id}>
                        {comp.legalName || comp.companyName} ({comp.country || 'India'})
                      </option>
                    ))}
                  </select>
                  {selectedCompany && (
                    <div className="mt-1.5 text-[11px] text-gray-400 bg-white/[0.02] p-2 rounded-lg border border-white/5">
                      {selectedCompany.legalName || selectedCompany.companyName} • GSTIN/Tax:{' '}
                      {selectedCompany.gstin || 'Active'} • IEC: Available
                    </div>
                  )}
                </div>

                {/* Foreign Buyer Selector */}
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">
                    Foreign Buyer / Consignee *
                  </label>
                  <select
                    required
                    value={quoteForm.partyId}
                    onChange={(e) => handlePartyChange(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#7FB706] transition min-h-[44px]"
                  >
                    <option value="">Select Foreign Buyer</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.legalName} {c.exportCustomerProfile?.country?.name ? `(${c.exportCustomerProfile.country.name})` : ''}
                      </option>
                    ))}
                  </select>
                  {selectedBuyer && (
                    <div className="mt-1.5 text-[11px] text-gray-400 bg-white/[0.02] p-2 rounded-lg border border-white/5 flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-white">{selectedBuyer.legalName}</span>
                        {selectedBuyer.email && <span> • {selectedBuyer.email}</span>}
                      </div>
                      {selectedCountry && (
                        <span className="px-2 py-0.5 rounded bg-white/5 text-[#7FB706] font-mono text-[10px]">
                          {selectedCountry.countryCode}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Logistics, Incoterms 2020 & Currency */}
            <div className="bg-[#0f0e26]/80 border border-white/10 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl">
              <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                <Globe className="w-4 h-4 text-[#7FB706]" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  2. Trade Scope, Incoterms &amp; Logistics
                </h3>
              </div>

              {/* Quotation Scope Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Export Trade Scope
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['CUBICLE', 'BOARD', 'HARDWARE', 'CUSTOM'] as ExportScope[]).map((scopeOption) => (
                    <button
                      key={scopeOption}
                      type="button"
                      onClick={() => setQuoteForm({ ...quoteForm, scope: scopeOption })}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        quoteForm.scope === scopeOption
                          ? 'bg-[#7FB706] text-[#030213] shadow-md shadow-[#7FB706]/20'
                          : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      {scopeOption === 'CUBICLE' && <Layers className="w-3.5 h-3.5" />}
                      {scopeOption === 'BOARD' && <Package className="w-3.5 h-3.5" />}
                      {scopeOption === 'HARDWARE' && <ShieldCheck className="w-3.5 h-3.5" />}
                      {scopeOption === 'CUSTOM' && <Globe className="w-3.5 h-3.5" />}
                      <span>
                        {scopeOption === 'CUBICLE'
                          ? 'Cubicles (Sets)'
                          : scopeOption === 'BOARD'
                          ? 'Compact Laminate (HPL)'
                          : scopeOption === 'HARDWARE'
                          ? 'Hardware Kits'
                          : 'Custom Mixed'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                {/* Incoterms */}
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Incoterms 2020 *</label>
                  <select
                    value={quoteForm.incotermId}
                    onChange={(e) => setQuoteForm({ ...quoteForm, incotermId: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#7FB706] transition min-h-[44px]"
                  >
                    <option value="">Select Incoterm</option>
                    {incoterms.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.code} — {i.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Port of Loading */}
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Port of Loading (India)</label>
                  <select
                    value={quoteForm.portOfLoadingId}
                    onChange={(e) => setQuoteForm({ ...quoteForm, portOfLoadingId: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#7FB706] transition min-h-[44px]"
                  >
                    <option value="">Select Indian Loading Port</option>
                    {ports
                      .filter((p) => !p.countryId || p.countryId === 'IN' || p.portCode?.startsWith('IN'))
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.portCode})
                        </option>
                      ))}
                  </select>
                </div>

                {/* Destination Country */}
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Destination Country</label>
                  <select
                    value={quoteForm.countryId}
                    onChange={(e) => setQuoteForm({ ...quoteForm, countryId: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#7FB706] transition min-h-[44px]"
                  >
                    <option value="">Select Country</option>
                    {countries.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.countryCode})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Port of Destination */}
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Port of Destination</label>
                  <select
                    value={quoteForm.portOfDestinationId}
                    onChange={(e) => setQuoteForm({ ...quoteForm, portOfDestinationId: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#7FB706] transition min-h-[44px]"
                  >
                    <option value="">Select Destination Port</option>
                    {ports.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.portCode})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Currency & Validity */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-white/5 text-xs">
                {/* Currency & Exchange Rate with Real-time Rate Sync */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-gray-300 font-semibold">Export Currency &amp; INR Rate</label>
                    <button
                      type="button"
                      onClick={() => setShowForexDesk((prev) => !prev)}
                      className="text-[11px] text-[#7FB706] hover:text-[#97db0a] font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <DollarSign className="w-3 h-3" />
                      <span>{showForexDesk ? 'Hide Converter' : 'Live Converter'}</span>
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={quoteForm.currency}
                      onChange={(e) => handleCurrencyChange(e.target.value)}
                      className="bg-black/40 border border-white/10 rounded-xl px-2.5 py-2.5 text-white font-bold focus:outline-none focus:border-[#7FB706] min-h-[44px]"
                    >
                      {EXPORT_CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.code} ({c.symbol})
                        </option>
                      ))}
                    </select>
                    <div className="relative flex-1">
                      <input
                        type="number"
                        step="0.0001"
                        value={quoteForm.exchangeRate}
                        onChange={(e) => setQuoteForm({ ...quoteForm, exchangeRate: parseFloat(e.target.value) || 1 })}
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-3 pr-10 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-[#7FB706] min-h-[44px]"
                        placeholder="Rate to INR"
                        title="Current INR Conversion Rate"
                      />
                      <button
                        type="button"
                        onClick={() => handleSyncLiveRate(quoteForm.currency)}
                        disabled={isFetchingForexRate}
                        title="Sync live rate from ExchangeRate-API"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-[#7FB706] rounded-lg hover:bg-white/5 transition cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isFetchingForexRate ? 'animate-spin text-[#7FB706]' : ''}`} />
                      </button>
                    </div>
                  </div>
                  {quoteForm.currency !== 'INR' && (
                    <div className="flex items-center justify-between text-[11px] text-gray-400 mt-1 px-1">
                      <span>1 {quoteForm.currency} = ₹{Number(quoteForm.exchangeRate || 1).toFixed(4)}</span>
                      <button
                        type="button"
                        onClick={() => handleSyncLiveRate(quoteForm.currency)}
                        className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Sync Live Rate
                      </button>
                    </div>
                  )}
                </div>

                {/* Validity Days */}
                <div className="sm:col-span-2">
                  <label className="block text-gray-300 font-semibold mb-1">
                    Quotation Validity: {quoteForm.validityDays} Days (Until {quoteForm.validUntil || 'N/A'})
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {[15, 30, 45, 60, 90].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleSetValidityDays(d)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer min-h-[44px] ${
                          quoteForm.validityDays === d
                            ? 'bg-[#7FB706] text-[#030213]'
                            : 'bg-white/5 hover:bg-white/10 text-gray-300'
                        }`}
                      >
                        {d} Days
                      </button>
                    ))}
                    <input
                      type="date"
                      value={quoteForm.validUntil}
                      onChange={(e) => setQuoteForm({ ...quoteForm, validUntil: e.target.value })}
                      className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
                    />
                  </div>
                </div>
              </div>

              {/* Expandable Live Forex Desk & Hedging Calculator */}
              {showForexDesk && (
                <div className="pt-3 border-t border-white/10 animate-in fade-in slide-in-from-top-2 duration-200">
                  <RealtimeCurrencyConverter
                    defaultFrom={quoteForm.currency}
                    defaultTo="INR"
                    defaultAmount={calculatedTotalAmount > 0 ? calculatedTotalAmount : 10000}
                    title="Real-Time Exchange Rate & Quotation Costing Desk"
                    onApplyRate={(from: string, to: string, rate: number) => {
                      if (to === 'INR') {
                        setQuoteForm((prev) => ({ ...prev, currency: from, exchangeRate: rate }));
                      } else if (from === 'INR') {
                        setQuoteForm((prev) => ({ ...prev, currency: to, exchangeRate: Math.round((1 / rate) * 10000) / 10000 }));
                      } else {
                        setQuoteForm((prev) => ({ ...prev, currency: from, exchangeRate: rate }));
                      }
                    }}
                  />
                </div>
              )}
            </div>

            {/* Section 3: Line Items Manager & Product Presets */}
            <div className="bg-[#0f0e26]/80 border border-white/10 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#7FB706]" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    3. Product Line Items ({quoteForm.items.length})
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPresetItemIndex(null);
                      setShowPresetModal(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#7FB706]/20 to-[#B5F823]/20 hover:from-[#7FB706]/30 hover:to-[#B5F823]/30 text-[#7FB706] border border-[#7FB706]/30 font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[40px]"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Choose from Catalog Presets</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddItem()}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[40px]"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#7FB706]" />
                    <span>Add Custom Item</span>
                  </button>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-4">
                {quoteForm.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-3 relative transition hover:border-white/20"
                  >
                    {/* Item Card Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-white/10 text-white font-mono font-bold text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={item.itemCode || ''}
                          onChange={(e) => handleItemChange(idx, 'itemCode', e.target.value)}
                          placeholder="Item Code (e.g. EXP-CUB-12MM)"
                          className="bg-transparent border-0 font-mono text-xs font-bold text-[#7FB706] focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setPresetItemIndex(idx);
                            setShowPresetModal(true);
                          }}
                          className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                          title="Replace with catalog preset"
                        >
                          <Layers className="w-3 h-3 text-[#7FB706]" /> Preset
                        </button>
                        {catalogModels.length > 0 && (
                          <select
                            value=""
                            onChange={(e) => {
                              const found = catalogModels.find((m) => m.id === e.target.value);
                              if (found) handleApplyCatalogModelToItem(found, idx);
                            }}
                            className="bg-[#161536] border border-white/10 hover:border-[#7FB706]/40 rounded px-2 py-1 text-gray-300 hover:text-white text-[11px] font-semibold focus:outline-none focus:border-[#7FB706]"
                            title="Apply official product catalog model"
                          >
                            <option value="">Apply Catalog Model...</option>
                            {catalogModels.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.title} ({m.category})
                              </option>
                            ))}
                          </select>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDuplicateItem(idx)}
                          className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white cursor-pointer"
                          title="Duplicate line item"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {quoteForm.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Item Description Textarea */}
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                        Technical Description &amp; Specifications *
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={item.description}
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        className="w-full bg-[#070714] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#7FB706] transition"
                        placeholder="Detailed technical specification, dimensions, hardware inclusions, board grade, finish..."
                      />
                    </div>

                    {/* Rates, Qty, HS Code & Calculations Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs">
                      {/* HS Code */}
                      <div className="col-span-2 sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-gray-400 mb-1">HS Code</label>
                        <select
                          value={item.hsCodeId || ''}
                          onChange={(e) => handleItemChange(idx, 'hsCodeId', e.target.value)}
                          className="w-full bg-[#070714] border border-white/10 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-[#7FB706] min-h-[40px]"
                        >
                          <option value="">Standard (3925.90.90 / 7326.90.99)</option>
                          {hsCodes.map((h) => (
                            <option key={h.id} value={h.id}>
                              {h.hsCode} — {h.description.slice(0, 32)}...
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity */}
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-400 mb-1">Quantity</label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full bg-[#070714] border border-white/10 rounded-xl px-2.5 py-2 text-white text-right font-bold focus:outline-none focus:border-[#7FB706] min-h-[40px]"
                        />
                      </div>

                      {/* Unit */}
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-400 mb-1">Unit</label>
                        <select
                          value={item.unit}
                          onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                          className="w-full bg-[#070714] border border-white/10 rounded-xl px-2 py-2 text-white focus:outline-none focus:border-[#7FB706] min-h-[40px]"
                        >
                          <option value="SETS">SETS</option>
                          <option value="NOS">NOS</option>
                          <option value="SHEETS">SHEETS</option>
                          <option value="SQFT">SQFT</option>
                          <option value="SQM">SQM</option>
                          <option value="PCS">PCS</option>
                          <option value="BOXES">BOXES</option>
                        </select>
                      </div>

                      {/* Unit Rate */}
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                          Rate ({quoteForm.currency})
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.unitRate}
                          onChange={(e) => handleItemChange(idx, 'unitRate', parseFloat(e.target.value) || 0)}
                          className="w-full bg-[#070714] border border-white/10 rounded-xl px-2.5 py-2 text-white text-right font-bold focus:outline-none focus:border-[#7FB706] min-h-[40px]"
                        />
                      </div>

                      {/* Item Total */}
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-400 mb-1">Subtotal</label>
                        <div className="py-2.5 px-2 bg-white/5 rounded-xl text-right font-black text-[#7FB706] text-xs min-h-[40px]">
                          {quoteForm.currency} {(item.quantity * item.unitRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>

                    {/* Weight & CBM Grid (Export Essential) */}
                    <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/5 text-[11px]">
                      <div>
                        <label className="block text-gray-500 mb-0.5">Est. Volume (CBM / m³)</label>
                        <input
                          type="number"
                          step="0.001"
                          value={item.cbm || 0}
                          onChange={(e) => handleItemChange(idx, 'cbm', parseFloat(e.target.value) || 0)}
                          className="w-full bg-[#070714] border border-white/5 rounded-lg px-2 py-1 text-gray-300 text-right focus:outline-none focus:border-[#7FB706]"
                          placeholder="CBM"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-500 mb-0.5">Gross Weight (KG)</label>
                        <input
                          type="number"
                          step="1"
                          value={item.grossWeightKg || 0}
                          onChange={(e) => handleItemChange(idx, 'grossWeightKg', parseFloat(e.target.value) || 0)}
                          className="w-full bg-[#070714] border border-white/5 rounded-lg px-2 py-1 text-gray-300 text-right focus:outline-none focus:border-[#7FB706]"
                          placeholder="Gross Weight"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-500 mb-0.5">Net Weight (KG)</label>
                        <input
                          type="number"
                          step="1"
                          value={item.netWeightKg || 0}
                          onChange={(e) => handleItemChange(idx, 'netWeightKg', parseFloat(e.target.value) || 0)}
                          className="w-full bg-[#070714] border border-white/5 rounded-lg px-2 py-1 text-gray-300 text-right focus:outline-none focus:border-[#7FB706]"
                          placeholder="Net Weight"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Items Summary Footer */}
              <div className="bg-black/30 border border-white/10 rounded-xl p-3 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex flex-wrap items-center gap-4 text-gray-400">
                  <div>
                    Total Items: <span className="font-bold text-white">{quoteForm.items.length}</span>
                  </div>
                  <div>
                    Total Volume: <span className="font-bold text-[#7FB706]">{calculatedTotalCbm.toFixed(3)} m³ (CBM)</span>
                  </div>
                  <div>
                    Gross Weight: <span className="font-bold text-white">{calculatedTotalGrossWeight.toLocaleString()} KG</span>
                  </div>
                  <div>
                    Net Weight: <span className="font-bold text-white">{calculatedTotalNetWeight.toLocaleString()} KG</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-gray-400 mr-2">FOB Goods Subtotal:</span>
                  <span className="text-base font-black text-white">
                    {quoteForm.currency} {calculatedSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 4: Freight, Marine Insurance & Commercial Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Additional Shipping & Charges */}
              <div className="bg-[#0f0e26]/80 border border-white/10 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl text-xs">
                <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                  <Anchor className="w-4 h-4 text-[#7FB706]" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    4. Sea/Air Freight &amp; Insurance
                  </h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">
                      International Freight Charges ({quoteForm.currency})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={quoteForm.freightCharges}
                      onChange={(e) => setQuoteForm({ ...quoteForm, freightCharges: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
                      placeholder="0.00"
                    />
                    <span className="text-[10px] text-gray-500">Applicable for CIF / CFR / DAP / DDP Incoterms</span>
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">
                      Marine Transit Cargo Insurance ({quoteForm.currency})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={quoteForm.insuranceCharges}
                      onChange={(e) => setQuoteForm({ ...quoteForm, insuranceCharges: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
                      placeholder="0.00"
                    />
                    <span className="text-[10px] text-gray-500">Applicable for CIF / CIP Incoterms (Institute Cargo Clauses A)</span>
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">
                      Export Packing, Palletization &amp; Port Inspection ({quoteForm.currency})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={quoteForm.otherCharges}
                      onChange={(e) => setQuoteForm({ ...quoteForm, otherCharges: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              {/* Total Financial Summary Card */}
              <div className="bg-gradient-to-br from-[#0f0e26] to-[#070714] border border-white/15 rounded-2xl p-4 sm:p-6 flex flex-col justify-between shadow-xl">
                <div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      Commercial Summary
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#7FB706]/15 text-[#7FB706]">
                      {selectedIncoterm?.code || 'FOB'} Terms
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between text-gray-400">
                      <span>FOB Goods Subtotal:</span>
                      <span className="font-semibold text-white">
                        {quoteForm.currency} {calculatedSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    {Number(quoteForm.freightCharges) > 0 && (
                      <div className="flex justify-between text-gray-400">
                        <span>Sea/Air Freight:</span>
                        <span className="text-white">
                          {quoteForm.currency} {Number(quoteForm.freightCharges).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}

                    {Number(quoteForm.insuranceCharges) > 0 && (
                      <div className="flex justify-between text-gray-400">
                        <span>Marine Insurance:</span>
                        <span className="text-white">
                          {quoteForm.currency} {Number(quoteForm.insuranceCharges).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}

                    {Number(quoteForm.otherCharges) > 0 && (
                      <div className="flex justify-between text-gray-400">
                        <span>Packing &amp; Inspection:</span>
                        <span className="text-white">
                          {quoteForm.currency} {Number(quoteForm.otherCharges).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}

                    <div className="pt-3 border-t border-white/10 flex justify-between items-baseline">
                      <div>
                        <span className="text-xs uppercase font-bold text-gray-300 block">
                          Total Export Offer ({selectedIncoterm?.code || 'FOB'}):
                        </span>
                        <span className="text-[10px] text-gray-500">
                          Approx. ₹{Math.round(totalInInr).toLocaleString('en-IN')} INR @ {quoteForm.exchangeRate}
                        </span>
                      </div>
                      <span className="text-xl sm:text-2xl font-black text-[#7FB706]">
                        {quoteForm.currency} {calculatedTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-gray-400">
                  <span>Shipping Port: {selectedPortOfDestination?.name || 'Foreign Port'}</span>
                  <span>Validity: {quoteForm.validUntil}</span>
                </div>
              </div>
            </div>

            {/* Section 5: Standard International Terms & Conditions */}
            <div className="bg-[#0f0e26]/80 border border-white/10 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl text-xs">
              <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                <ShieldCheck className="w-4 h-4 text-[#7FB706]" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  5. International Payment, Delivery &amp; Quality Terms
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Payment Terms */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-gray-300 font-semibold">Payment Terms *</label>
                    <div className="flex gap-1 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setQuoteForm({
                          ...quoteForm,
                          paymentTerms: '30% Advance T/T upon Purchase Order; balance 70% against copy of Bill of Lading (B/L) and shipping documents.'
                        })}
                        className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-gray-300 cursor-pointer"
                      >
                        30/70 BL
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuoteForm({
                          ...quoteForm,
                          paymentTerms: '100% Irrevocable Confirmed Letter of Credit (L/C) at sight against export shipping documents.'
                        })}
                        className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-gray-300 cursor-pointer"
                      >
                        100% LC
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuoteForm({
                          ...quoteForm,
                          paymentTerms: '50% Advance T/T, balance 50% prior to dispatch against factory packing list & photo inspection.'
                        })}
                        className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-gray-300 cursor-pointer"
                      >
                        50/50
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={2}
                    value={quoteForm.paymentTerms}
                    onChange={(e) => setQuoteForm({ ...quoteForm, paymentTerms: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[#7FB706]"
                  />
                </div>

                {/* Delivery Terms */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-gray-300 font-semibold">Delivery &amp; Production Period *</label>
                    <div className="flex gap-1 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setQuoteForm({
                          ...quoteForm,
                          deliveryTerms: '3 to 4 weeks from confirmed PO, advance receipt, and approved fabrication shop drawings.'
                        })}
                        className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-gray-300 cursor-pointer"
                      >
                        3–4 Wks
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuoteForm({
                          ...quoteForm,
                          deliveryTerms: 'Ready factory stock: dispatch to Indian loading port within 7-10 working days.'
                        })}
                        className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-gray-300 cursor-pointer"
                      >
                        Stock 7d
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={2}
                    value={quoteForm.deliveryTerms}
                    onChange={(e) => setQuoteForm({ ...quoteForm, deliveryTerms: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[#7FB706]"
                  />
                </div>

                {/* Export Packing */}
                <div className="space-y-1.5">
                  <label className="text-gray-300 font-semibold">Export Packing &amp; Palletization (ISPM-15)</label>
                  <textarea
                    rows={2}
                    value={quoteForm.packingTerms}
                    onChange={(e) => setQuoteForm({ ...quoteForm, packingTerms: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[#7FB706]"
                  />
                </div>

                {/* Warranty */}
                <div className="space-y-1.5">
                  <label className="text-gray-300 font-semibold">Manufacturer Warranty</label>
                  <textarea
                    rows={2}
                    value={quoteForm.warrantyTerms}
                    onChange={(e) => setQuoteForm({ ...quoteForm, warrantyTerms: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[#7FB706]"
                  />
                </div>
              </div>

              {/* Commercial Notes */}
              <div>
                <label className="block text-gray-300 font-semibold mb-1">
                  General Commercial Notes &amp; Bank Routing Instructions
                </label>
                <textarea
                  rows={2}
                  value={quoteForm.notes}
                  onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[#7FB706]"
                />
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10">
              <Link
                to="/admin/dashboard/export/quotations"
                className="w-full sm:w-auto px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl min-h-[48px] flex items-center justify-center gap-2 transition"
              >
                Cancel
              </Link>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 font-bold flex items-center justify-center gap-2 min-h-[48px] cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-[#7FB706]" />
                  <span>Preview Letterhead</span>
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-[#7FB706] to-[#6fa005] hover:from-[#6fa005] hover:to-[#5d8704] text-[#030213] font-black rounded-xl shadow-lg shadow-[#7FB706]/20 min-h-[48px] flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer active:scale-95"
                >
                  <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                  <span>
                    {isSubmitting
                      ? 'Saving...'
                      : isEditMode
                      ? 'Update Export Quotation'
                      : isCloneMode
                      ? 'Save Cloned Quotation'
                      : 'Generate Official Export Quotation'}
                  </span>
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* RFQ FORM */
          <form onSubmit={handleCreateRfq} className="bg-[#0f0e26]/80 border border-white/10 rounded-2xl p-5 sm:p-6 space-y-6 shadow-xl">
            <h3 className="text-sm font-bold text-white border-b border-white/10 pb-2 mb-4">Inbound RFQ Details</h3>
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Foreign Buyer *</label>
                  <select
                    required
                    value={rfqForm.partyId}
                    onChange={(e) => setRfqForm({ ...rfqForm, partyId: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
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
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
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
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
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
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Requirements / Notes</label>
                <textarea
                  rows={4}
                  value={rfqForm.notes}
                  onChange={(e) => setRfqForm({ ...rfqForm, notes: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-end gap-3 mt-6">
              <Link to="/admin/dashboard/export/quotations?type=rfq" className="w-full sm:w-auto px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl min-h-[48px] flex items-center justify-center gap-2 transition">Cancel</Link>
              <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto px-6 py-3 bg-[#7FB706] hover:bg-[#6fa005] text-[#030213] font-bold rounded-xl shadow-lg shadow-[#7FB706]/20 min-h-[48px] flex items-center justify-center gap-2 transition disabled:opacity-50">
                <CheckCircle2 className="w-5 h-5" />
                {isSubmitting ? 'Saving...' : 'Record RFQ'}
              </button>
            </div>
          </form>
        )
      ) : (
        /* LIVE A4 VECTOR LETTERHEAD PREVIEW */
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-[#0f0e26] p-3 rounded-2xl border border-white/10">
            <button
              onClick={() => setActiveTab('form')}
              className="px-4 py-2 rounded-xl bg-white/10 text-white font-bold text-xs flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Edit Form
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-[#7FB706] text-[#030213] font-black text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-[#7FB706]/20"
            >
              <Printer className="w-4 h-4" /> Print Quotation (PDF)
            </button>
          </div>

          {/* Official A4 Sheet Representation */}
          <div className="bg-white text-gray-900 rounded-2xl shadow-2xl p-8 sm:p-12 max-w-4xl mx-auto space-y-6 font-sans text-xs border border-gray-200">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-[#7FB706] pb-4">
              <div>
                <h2 className="text-xl font-black text-[#030213] tracking-tight uppercase">
                  {selectedCompany?.legalName || selectedCompany?.companyName || 'PACIFIC PRODUCTS & SOLUTIONS'}
                </h2>
                <p className="text-[11px] text-gray-600 mt-0.5">
                  Architectural Restroom Cubicle Systems &amp; Compact Laminate Exports
                </p>
                <p className="text-[10px] text-gray-500">
                  Mandoli Industrial Area, Delhi – 110093, India • Email: export@pacificrestroom.com
                </p>
                <p className="text-[10px] text-gray-500">
                  GSTIN: {selectedCompany?.gstin || '07AAGCP8416R1Z9'} • IEC: Certified Exporter
                </p>
              </div>

              <div className="text-right">
                <div className="px-3 py-1 bg-gray-100 text-[#030213] font-mono font-bold text-xs rounded border border-gray-300 inline-block mb-1">
                  {quoteForm.quotationNumber || 'EXP/QT/2026/DRAFT'}
                </div>
                <div className="text-[10px] text-gray-500">Date: {new Date().toLocaleDateString('en-GB')}</div>
                <div className="text-[10px] text-gray-500">Validity: Until {quoteForm.validUntil || '30 Days'}</div>
              </div>
            </div>

            {/* Consignee & Trade Terms Box */}
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div>
                <span className="text-[9px] uppercase tracking-wider font-bold text-gray-400 block mb-1">
                  Foreign Buyer / Consignee:
                </span>
                <div className="font-bold text-sm text-gray-900">{selectedBuyer?.legalName || 'Foreign Buyer'}</div>
                {selectedCountry && <div className="text-gray-600">Country: {selectedCountry.name}</div>}
                {selectedBuyer?.email && <div className="text-gray-600">Email: {selectedBuyer.email}</div>}
                {selectedBuyer?.phone && <div className="text-gray-600">Phone: {selectedBuyer.phone}</div>}
              </div>

              <div>
                <span className="text-[9px] uppercase tracking-wider font-bold text-gray-400 block mb-1">
                  Shipment &amp; Trade Terms:
                </span>
                <div className="text-gray-700">
                  Incoterm: <strong className="text-[#030213]">{selectedIncoterm?.code || 'FOB'}</strong>
                </div>
                <div className="text-gray-700">
                  Port of Loading: <strong>{selectedPortOfLoading?.name || 'Any Indian Port'}</strong>
                </div>
                <div className="text-gray-700">
                  Port of Destination: <strong>{selectedPortOfDestination?.name || 'Destination Port'}</strong>
                </div>
                <div className="text-gray-700">Currency: <strong>{quoteForm.currency}</strong></div>
              </div>
            </div>

            {/* Line Items Table */}
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300 bg-gray-100 text-[10px] uppercase font-bold text-gray-700">
                  <th className="py-2 px-2">#</th>
                  <th className="py-2 px-2">Description &amp; Specifications</th>
                  <th className="py-2 px-2 text-center">HS Code</th>
                  <th className="py-2 px-2 text-right">Qty</th>
                  <th className="py-2 px-2 text-center">Unit</th>
                  <th className="py-2 px-2 text-right">Unit Rate ({quoteForm.currency})</th>
                  <th className="py-2 px-2 text-right">Amount ({quoteForm.currency})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {quoteForm.items.map((it, idx) => (
                  <tr key={idx}>
                    <td className="py-2 px-2 text-gray-400 font-mono">{idx + 1}</td>
                    <td className="py-2 px-2">
                      <div className="font-bold text-gray-900">{it.itemCode || 'EXP-ITEM'}</div>
                      <div className="text-[11px] text-gray-600 whitespace-pre-line">{it.description}</div>
                    </td>
                    <td className="py-2 px-2 text-center font-mono text-gray-600">
                      {hsCodes.find((h) => h.id === it.hsCodeId)?.hsCode || '3925.90.90'}
                    </td>
                    <td className="py-2 px-2 text-right font-bold">{it.quantity}</td>
                    <td className="py-2 px-2 text-center text-gray-600">{it.unit}</td>
                    <td className="py-2 px-2 text-right font-mono">{Number(it.unitRate).toFixed(2)}</td>
                    <td className="py-2 px-2 text-right font-mono font-bold text-gray-900">
                      {(it.quantity * it.unitRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Financial Summary */}
            <div className="flex justify-end pt-2 border-t-2 border-gray-200">
              <div className="w-64 space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Goods FOB Subtotal:</span>
                  <span className="font-mono">{quoteForm.currency} {calculatedSubtotal.toFixed(2)}</span>
                </div>
                {Number(quoteForm.freightCharges) > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Freight Charges:</span>
                    <span className="font-mono">{quoteForm.currency} {Number(quoteForm.freightCharges).toFixed(2)}</span>
                  </div>
                )}
                {Number(quoteForm.insuranceCharges) > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Insurance Charges:</span>
                    <span className="font-mono">{quoteForm.currency} {Number(quoteForm.insuranceCharges).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm text-[#030213] border-t border-gray-300 pt-1.5">
                  <span>Total Offer ({selectedIncoterm?.code || 'FOB'}):</span>
                  <span className="font-mono">{quoteForm.currency} {calculatedTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Terms & Conditions */}
            <div className="border-t border-gray-200 pt-4 space-y-2 text-[10px] text-gray-600">
              <h4 className="font-bold uppercase text-gray-800 text-[11px]">Commercial Terms &amp; Conditions</h4>
              <p>• <strong>Payment:</strong> {quoteForm.paymentTerms}</p>
              <p>• <strong>Delivery:</strong> {quoteForm.deliveryTerms}</p>
              <p>• <strong>Packing:</strong> {quoteForm.packingTerms}</p>
              <p>• <strong>Warranty:</strong> {quoteForm.warrantyTerms}</p>
            </div>

            {/* Authorized Signatory */}
            <div className="pt-8 flex justify-between items-end border-t border-gray-200">
              <div className="text-[10px] text-gray-400">
                Generated via Pacific Enterprise ERP Console • Verified Document
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-gray-900">For PACIFIC PRODUCTS &amp; SOLUTIONS</div>
                <div className="text-[10px] text-gray-500 mt-8">Authorized Signatory / Export Division</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Catalog Preset Selector Modal */}
      {showPresetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#0f0e26] border border-white/15 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#070714]">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#7FB706]" />
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Select Pacific Export Product Preset
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPresetModal(false);
                  setPresetItemIndex(null);
                }}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Switcher */}
            <div className="flex border-b border-white/10 bg-[#070714] px-6">
              <button
                type="button"
                onClick={() => setPresetModalTab('catalog')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition ${
                  presetModalTab === 'catalog'
                    ? 'border-[#7FB706] text-[#7FB706]'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                Official Product Models ({catalogModels.length})
              </button>
              <button
                type="button"
                onClick={() => setPresetModalTab('presets')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition ${
                  presetModalTab === 'presets'
                    ? 'border-[#7FB706] text-[#7FB706]'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                Export Commercial Presets ({EXPORT_PRODUCT_PRESETS.length})
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
              {presetModalTab === 'catalog' ? (
                catalogModels.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-xs">
                    No catalog models found. Check your database connection.
                  </div>
                ) : (
                  catalogModels.map((model) => (
                    <div
                      key={model.id}
                      onClick={() => handleApplyCatalogModelToItem(model, presetItemIndex)}
                      className="bg-black/40 hover:bg-white/[0.04] border border-white/10 hover:border-[#7FB706]/40 p-4 rounded-2xl cursor-pointer transition space-y-2 group"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#7FB706]/10 text-[#7FB706] border border-[#7FB706]/20">
                              {model.category}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              Slug: {model.slug}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-white group-hover:text-[#7FB706] transition mt-1">
                            {model.title}
                          </h4>
                          {model.subtitle && (
                            <p className="text-[11px] text-gray-400 mt-0.5">{model.subtitle}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#7FB706]/20 text-[#7FB706] group-hover:bg-[#7FB706] group-hover:text-black transition">
                            {presetItemIndex === null ? '+ Add Item' : 'Apply to Line Item'}
                          </span>
                        </div>
                      </div>

                      {model.description && (
                        <p className="text-[11px] text-gray-400 line-clamp-2">{model.description}</p>
                      )}

                      {model.specifications && model.specifications.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1 border-t border-white/5">
                          {model.specifications
                            .filter((s) => !s.label.startsWith('__'))
                            .slice(0, 3)
                            .map((s, sIdx) => (
                              <span key={sIdx} className="text-[10px] text-gray-400 bg-white/5 px-2 py-0.5 rounded">
                                <strong className="text-gray-300">{s.label}:</strong> {s.value}
                              </span>
                              ))}
                        </div>
                      )}
                    </div>
                  ))
                )
              ) : (
              EXPORT_PRODUCT_PRESETS.map((preset, pIdx) => (
                <div
                  key={pIdx}
                  onClick={() => handleApplyPresetToItem(preset)}
                  className="bg-black/40 hover:bg-white/[0.04] border border-white/10 hover:border-[#7FB706]/40 p-4 rounded-2xl cursor-pointer transition space-y-2 group"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 text-[#7FB706] border border-white/5">
                        {preset.category}
                      </span>
                      <h4 className="text-sm font-bold text-white group-hover:text-[#7FB706] transition mt-1">
                        {preset.name}
                      </h4>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-white">
                        ${preset.defaultRateUSD} <span className="text-[10px] text-gray-400">/ {preset.unit}</span>
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono">HS: {preset.hsCode}</div>
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-400 line-clamp-2">{preset.description}</p>

                  <div className="flex items-center gap-4 text-[10px] text-gray-500 pt-1 border-t border-white/5">
                    <span>CBM / Unit: {preset.cbmPerUnit} m³</span>
                    <span>Gross Weight: {preset.grossWeightPerUnit} KG</span>
                    <span>Net Weight: {preset.netWeightPerUnit} KG</span>
                  </div>
                </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Inline "Add Foreign Buyer" Modal */}
      {showNewBuyerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#0f0e26] border border-white/15 rounded-3xl w-full max-w-lg p-5 sm:p-6 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">Add Foreign Buyer</h3>
              <button
                type="button"
                onClick={() => setShowNewBuyerModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewBuyer} className="space-y-3">
              <div>
                <label className="text-gray-300 font-semibold block mb-1">Company Legal Name *</label>
                <input
                  required
                  type="text"
                  value={newBuyerForm.legalName}
                  onChange={(e) => setNewBuyerForm({ ...newBuyerForm, legalName: e.target.value })}
                  placeholder="e.g. Al-Futtaim Construction LLC"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-300 font-semibold block mb-1">Country</label>
                  <select
                    value={newBuyerForm.countryId}
                    onChange={(e) => setNewBuyerForm({ ...newBuyerForm, countryId: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white min-h-[44px]"
                  >
                    <option value="">Select Country</option>
                    {countries.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-gray-300 font-semibold block mb-1">Tax ID / VAT No.</label>
                  <input
                    type="text"
                    value={newBuyerForm.taxNumber}
                    onChange={(e) => setNewBuyerForm({ ...newBuyerForm, taxNumber: e.target.value })}
                    placeholder="TRN / VAT number"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white min-h-[44px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-300 font-semibold block mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={newBuyerForm.email}
                    onChange={(e) => setNewBuyerForm({ ...newBuyerForm, email: e.target.value })}
                    placeholder="procurement@buyer.com"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="text-gray-300 font-semibold block mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={newBuyerForm.phone}
                    onChange={(e) => setNewBuyerForm({ ...newBuyerForm, phone: e.target.value })}
                    placeholder="+971 50 123 4567"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-300 font-semibold block mb-1">Registered Address</label>
                <textarea
                  rows={2}
                  value={newBuyerForm.address}
                  onChange={(e) => setNewBuyerForm({ ...newBuyerForm, address: e.target.value })}
                  placeholder="Street, City, P.O. Box"
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowNewBuyerModal(false)}
                  className="px-4 py-2 bg-white/5 rounded-xl text-gray-300 min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingBuyer}
                  className="px-5 py-2.5 bg-[#7FB706] text-[#030213] rounded-xl font-bold flex items-center gap-1.5 min-h-[44px] disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{creatingBuyer ? 'Saving...' : 'Save & Select Buyer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
