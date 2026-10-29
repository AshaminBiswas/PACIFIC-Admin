import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom';
import {
  FileText, ArrowLeft, Save, Plus, Trash2, RefreshCw,
  AlertTriangle, RotateCcw, Wrench, Sparkles, Layers,
  UploadCloud, ExternalLink, Eye, History, Package,
} from 'lucide-react';
import { salesQuotationsApi } from '../api/salesQuotationsApi';
import { companiesApi } from '../api/companyApi';
import { productCatalogApi } from '../api/productCatalogApi';
import {
  getMergedQuotationModels,
  formatModelHardwareInclusions,
  extractModelDimensions,
} from '../utils/quotationProductPresets';
import DocumentFlowTimeline from '../components/common/DocumentFlowTimeline';
import BranchSelector from '../components/common/BranchSelector';
import ModelImageField from '../components/quotations/ModelImageField';
import { CustomQuotationItemCard } from '../components/common/CustomQuotationItemCard';
import type { ProductCatalogModel, CompanyProfile, QuotationScope, QuotationType } from '../types/admin';
import { scopeToType, typeToScope } from '../types/admin';
import { calculateGstSplit, isRestroomCubicleItem } from '../utils/tax';
import { uploadToImageKit } from '../lib/imagekit';
import {
  INSTALLATION_OPTIONS,
  RATE_PRESETS,
  getInstallationMentionText,
  formatInstallationTermClause,
  syncInstallationToGeneralTerms,
  detectInstallationOption,
  type InstallationPricingMode,
} from '../utils/quotationInstallation';

interface EditItem {
  id?: string;
  modelId?: string;
  customModelName?: string;
  modelName?: string;
  modelImageUrl?: string;
  isCustom?: boolean;
  hsnSac?: string;
  width?: string;
  depth?: string;
  height?: string;
  boardMaterial?: string;
  hardwareType?: string;
  colorFinish?: string;
  notes?: string;
  systemCategory?: 'cubicle' | 'ump' | 'locker' | 'board' | 'hardware' | 'custom' | string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  boardType?: 'HPL' | 'HDF' | string;
  cubicleSize?: string;
  boardColor?: string;
  boardThickness?: string;
  doorSize?: string;
  overallHeight?: string;
  hardwarePackage?: string;
  make?: string;
  customSpecsJson?: any;
}

interface EditFormData {
  companyProfileId?: string;
  quotationScope?: QuotationScope;
  quotationType?: QuotationType;
  recipientSalutation: string;
  recipientName: string;
  recipientCompany: string;
  recipientAddress: string;
  recipientEmail: string;
  recipientPhone: string;
  projectName: string;
  subject: string;
  title: string;
  validUntil: string;
  installationCharge: number;
  installationRatePerCubicle?: number;
  installationCubicleCount?: number;
  installationOption?: string;
  installationCustomNote?: string;
  freightTerms: string;
  freightAmount: number;
  gstRate: number;
  isSezExempt: boolean;
  sezCertificateRef: string;
  paymentTerms: string;
  deliveryTerms: string;
  warrantyText: string;
  accessoriesText: string;
  generalTerms: string;
  otherTerms: string;
  notes: string;
  selectedHardwarePreset?: string;
  customerGstin?: string;
  customerStateCode?: string;
  customerStateName?: string;
  drawingUrl?: string;
  drawingFileName?: string;
  drawingFileId?: string;
  drawingFileSize?: number;
  items: EditItem[];
}


const DEFAULT_ACCESSORIES_TEXT = '• Gravity Hinges: Self-closing SS 304 stainless steel gravity hinges with nylon cam mechanism.\n• Indicator Lock: SS 304 surface-mounted privacy lock with external red/white occupancy indicator and emergency release.\n• Supporting Shoe/Legs: SS 304 adjustable height support legs (100mm to 150mm ground clearance).\n• Coat Hook: SS 304 heavy-duty coat hook with integrated rubber door buffer.\n• Fasteners: Grade 304 stainless steel tamper-proof screws and expanding anchors.';

function getStorageKey(id: string) {
  return `pacific_edit_quotation_v1_${id}`;
}

export default function EditSalesQuotationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotationNum, setQuotationNum] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [installationMode, setInstallationMode] = useState<InstallationPricingMode>('RATE');
  const [catalogModels, setCatalogModels] = useState<ProductCatalogModel[]>([]);
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [revisionReason, setRevisionReason] = useState<string>('');
  const [currentRevNum, setCurrentRevNum] = useState<number>(1);

  const standardCubicleModels = useMemo(
    () => catalogModels.filter((m) => m.category === 'Cubicle'),
    [catalogModels]
  );
  const kidsCubicleModels = useMemo(
    () => catalogModels.filter((m) => m.category === 'Kids Toilet'),
    [catalogModels]
  );
  const cubicleModels = useMemo(
    () => catalogModels.filter((m) => m.category === 'Cubicle' || m.category === 'Kids Toilet'),
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

  useEffect(() => {
    productCatalogApi
      .listModels(undefined, true)
      .then((models) => setCatalogModels(getMergedQuotationModels(models || [])))
      .catch(() => setCatalogModels(getMergedQuotationModels([])));

    companiesApi
      .list()
      .then((res) => {
        const comps = res.data?.data;
        if (Array.isArray(comps)) setCompanies(comps);
      })
      .catch((err) => console.error('Failed to load companies:', err));
  }, []);

  const [form, setForm] = useState<EditFormData>({
    companyProfileId: '',
    quotationScope: typeToScope(searchParams.get('type') || 'cubicle'),
    quotationType: (searchParams.get('type') as QuotationType) || 'cubicle',
    recipientSalutation: 'Mr.',
    recipientName: '',
    recipientCompany: '',
    recipientAddress: '',
    recipientEmail: '',
    recipientPhone: '',
    projectName: '',
    subject: '',
    title: '',
    validUntil: '',
    installationCharge: 0,
    installationRatePerCubicle: 1000,
    installationCubicleCount: 0,
    installationOption: 'Included',
    installationCustomNote: '',
    freightTerms: 'Extra as Actual / To pay',
    freightAmount: 0,
    gstRate: 18,
    isSezExempt: false,
    sezCertificateRef: '',
    paymentTerms: '',
    deliveryTerms: '',
    warrantyText: '',
    accessoriesText: '',
    generalTerms: '',
    otherTerms: '',
    notes: '',
    selectedHardwarePreset: 'SS_304',
    customerGstin: '',
    customerStateCode: '',
    customerStateName: '',
    drawingUrl: '',
    drawingFileName: '',
    drawingFileId: '',
    drawingFileSize: 0,
    items: [],
  });

  // Load data from server
  useEffect(() => {
    if (!id) return;

    // Check if there's a saved draft in localStorage
    const storageKey = getStorageKey(id);
    const savedDraft = localStorage.getItem(storageKey);

    setLoading(true);
    salesQuotationsApi
      .getById(id)
      .then((res) => {
        const q: any = res.data?.data ?? res.data;
        setQuotationNum(q.referenceNumber || q.quotationNumber || q.id);
        setCurrentRevNum(q.revisionNumber || 1);

        const initialCharge = Number(q.installationCharge) || 0;
        const initialMode: InstallationPricingMode = initialCharge > 0 ? 'RATE' : 'OPTION';
        setInstallationMode(initialMode);
        const initialOption = q.installationOption || (initialCharge === 0 ? detectInstallationOption(q.generalTerms, q.otherTerms) : 'Included');

        // Determine Quotation Scope & Module
        const rawScopeTerm = (String(q.generalTerms || '') + '\n' + String(q.otherTerms || '')).match(/\[(?:QUOTATION_SCOPE|QUOTATION_TYPE|PI_SCOPE|SCOPE):([A-Z_a-z]+)\]/i)?.[1];
        let loadedScope: QuotationScope = 'CUBICLE';
        const typeParam = searchParams.get('type')?.toLowerCase();

        if (q.quotationScope) {
          loadedScope = q.quotationScope as QuotationScope;
        } else if (q.quotationType) {
          loadedScope = typeToScope(q.quotationType);
        } else if (rawScopeTerm) {
          const upper = rawScopeTerm.toUpperCase();
          if (upper.includes('HARDWARE')) loadedScope = 'HARDWARE';
          else if (upper.includes('BOARD')) loadedScope = 'BOARD';
          else if (upper.includes('CUSTOM')) loadedScope = 'CUSTOM_ITEM';
          else loadedScope = 'CUBICLE';
        } else if (typeParam) {
          loadedScope = typeToScope(typeParam);
        } else {
          const itemScope = q.items?.find((it: any) => it.customSpecsJson?.quotationScope)?.customSpecsJson?.quotationScope;
          const itemType = q.items?.find((it: any) => it.customSpecsJson?.quotationType)?.customSpecsJson?.quotationType;
          if (itemScope) {
            const us = String(itemScope).toUpperCase();
            loadedScope = us === 'HARDWARE' ? 'HARDWARE' : us === 'BOARD' ? 'BOARD' : us.includes('CUSTOM') ? 'CUSTOM_ITEM' : 'CUBICLE';
          } else if (itemType) {
            loadedScope = typeToScope(itemType);
          } else if (Array.isArray(q.items) && q.items.length > 0) {
            const hasCubicleSpecs = q.items.some((it: any) => {
              const d = (it.description || '').toLowerCase();
              return (it.cubicleSize && !it.cubicleSize.includes('4ft × 8ft') && !it.cubicleSize.includes('1220mm')) ||
                it.doorSize ||
                it.overallHeight ||
                d.includes('cubicle') ||
                d.includes('restroom') ||
                d.includes('urinal') ||
                d.includes('locker');
            });

            const allHardware = q.items.every((it: any) => {
              const d = (it.description || '').toLowerCase();
              const cat = (it.customSpecsJson?.systemCategory || it.systemCategory || '').toLowerCase();
              const u = (it.unit || '').toUpperCase();
              return cat === 'hardware' || u === 'PAIR' || u === 'SET' || it.hsnSac === '8302' ||
                (/hinge|indicator lock|leg|handle|hook|u-channel|screw|fastener/i.test(d) && !d.includes('cubicle'));
            });

            const allBoard = q.items.every((it: any) => {
              const d = (it.description || '').toLowerCase();
              const cat = (it.customSpecsJson?.systemCategory || it.systemCategory || '').toLowerCase();
              const u = (it.unit || '').toUpperCase();
              return cat === 'board' || u === 'SQFT' || u === 'SQM' || (/board|sheet|compact laminate/i.test(d) && !d.includes('cubicle') && !hasCubicleSpecs);
            });

            const allCustom = q.items.every((it: any) => {
              const cat = (it.customSpecsJson?.systemCategory || it.systemCategory || '').toLowerCase();
              return it.isCustom || it.customSpecsJson?.isCustom || cat === 'custom' || it.modelId === 'CUSTOM';
            });

            if (allHardware && !hasCubicleSpecs) loadedScope = 'HARDWARE';
            else if (allBoard && !hasCubicleSpecs) loadedScope = 'BOARD';
            else if (allCustom && !hasCubicleSpecs) loadedScope = 'CUSTOM_ITEM';
            else loadedScope = 'CUBICLE';
          }
        }

        const properType = scopeToType(loadedScope);
        if (searchParams.get('type') !== properType) {
          setSearchParams({ type: properType }, { replace: true });
        }

        // Build form data from API response
        const serverForm: EditFormData = {
          companyProfileId: q.companyProfileId || q.companyProfile?.id || '',
          quotationScope: loadedScope,
          quotationType: properType,
          recipientSalutation: q.recipientSalutation || 'Mr.',
          recipientName: q.recipientName || q.customer?.legalName || '',
          recipientCompany: q.recipientCompany || q.customer?.tradeName || '',
          recipientAddress: q.recipientAddress || '',
          recipientEmail: q.recipientEmail || '',
          recipientPhone: q.recipientPhone || '',
          projectName: q.projectName || '',
          subject: q.subject || '',
          title: q.title || '',
          validUntil: q.validUntil ? new Date(q.validUntil).toISOString().split('T')[0] : '',
          installationCharge: initialCharge,
          installationRatePerCubicle: q.installationRatePerCubicle || (initialCharge > 0 ? Math.round(initialCharge / (q.installationCubicleCount || 1)) : 1000),
          installationCubicleCount: q.installationCubicleCount || 0,
          installationOption: initialOption,
          installationCustomNote: q.installationCustomNote || '',
          freightTerms: q.freightTerms || 'Extra as Actual / To pay',
          freightAmount: Number(q.freightAmount) || 0,
          gstRate: Number(q.gstRate) || 18,
          isSezExempt: Boolean(q.isSezExempt || q.isSez),
          sezCertificateRef: q.sezCertificateRef || '',
          paymentTerms: q.paymentTerms || '',
          deliveryTerms: q.deliveryTerms || '',
          warrantyText: q.warrantyText || '',
          accessoriesText: q.accessoriesText || '',
          generalTerms: q.generalTerms || '',
          otherTerms: q.otherTerms || q.termsAndConditions || '',
          notes: q.notes || '',
          selectedHardwarePreset: q.selectedHardwarePreset || 'SS_304',
          customerGstin: q.customerGstin || q.customer?.gstin || '',
          customerStateCode: q.customer?.addresses?.[0]?.stateCode || '',
          customerStateName: q.customer?.addresses?.[0]?.state || '',
          drawingUrl: q.drawingUrl || '',
          drawingFileName: q.drawingFileName || '',
          drawingFileId: q.drawingFileId || '',
          drawingFileSize: q.drawingFileSize || 0,
          items: (q.items || []).map((it: any) => {
            const specs = (typeof it.customSpecsJson === 'object' ? it.customSpecsJson : {}) || {};
            const isLocker = (specs.systemCategory === 'locker') || (it.systemCategory === 'locker') || (it.description && it.description.toLowerCase().includes('locker'));
            const defaultUnit = isLocker ? '4' : 'NOS';
            const unitVal = it.unit && (isLocker ? (/^\d+$/.test(String(it.unit).trim()) ? String(it.unit).trim() : '4') : it.unit);
            const detectedCat = specs.systemCategory || it.systemCategory ||
              (isLocker ? 'locker' :
               it.description && (it.description.toLowerCase().includes('urinal') || it.description.toLowerCase().includes('ump')) ? 'ump' :
               loadedScope === 'HARDWARE' ? 'hardware' :
               loadedScope === 'BOARD' ? 'board' :
               loadedScope === 'CUSTOM_ITEM' || it.isCustom || specs.isCustom ? 'custom' : 'cubicle');

            return {
              id: it.id,
              modelId: it.modelId || it.productId || '',
              customModelName: it.customModelName || it.modelName || specs.customModelName || specs.modelName || '',
              modelName: it.modelName || specs.modelName || '',
              modelImageUrl: it.modelImageUrl || specs.modelImageUrl || specs.imageUrl || '',
              isCustom: Boolean(it.isCustom || specs.isCustom || detectedCat === 'custom' || it.modelId === 'CUSTOM'),
              hsnSac: it.hsnSac || specs.hsnSac || '',
              width: specs.width || '',
              depth: specs.depth || '',
              height: specs.height || '',
              boardMaterial: specs.boardMaterial || it.boardType || specs.boardType || '',
              hardwareType: specs.hardwareType || it.hardwarePackage || specs.hardwarePackage || '',
              colorFinish: specs.colorFinish || it.boardColor || specs.boardColor || '',
              notes: specs.notes || it.notes || '',
              description: it.description || it.itemDescription || '',
              unit: unitVal || defaultUnit,
              quantity: Number(it.quantity) || 1,
              rate: Number(it.rate ?? it.unitPrice) || 0,
              boardType: it.boardType || specs.boardType || 'HPL',
              cubicleSize: it.cubicleSize || (specs.width && specs.depth ? `${specs.width} × ${specs.depth}` : ''),
              boardColor: it.boardColor || specs.boardColor || specs.colorFinish || '',
              boardThickness: it.boardThickness || specs.boardThickness || '',
              doorSize: it.doorSize || specs.doorSize || '',
              overallHeight: it.overallHeight || specs.overallHeight || '',
              hardwarePackage: it.hardwarePackage || specs.hardwarePackage || specs.hardwareType || '',
              make: it.make || specs.make || 'Pacific',
              systemCategory: detectedCat,
              customSpecsJson: specs,
            };
          }),
        };

        // Clean pre-fill strictly from authoritative server data
        setForm(serverForm);
        // Clear any previous stale draft for this document so it doesn't corrupt subsequent edits
        try {
          localStorage.removeItem(storageKey);
        } catch {}
      })
      .catch((err) => {
        setError(err?.response?.data?.message || err?.message || 'Failed to load quotation');
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Auto-save to localStorage
  const autoSave = useCallback(
    (data: EditFormData) => {
      if (!id) return;
      localStorage.setItem(getStorageKey(id), JSON.stringify(data));
      setLastSaved(new Date());
    },
    [id]
  );

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => autoSave(form), 800);
      return () => clearTimeout(timer);
    }
  }, [form, loading, autoSave]);

  const resetDraft = () => {
    if (!id) return;
    localStorage.removeItem(getStorageKey(id));
    window.location.reload();
  };

  // Live totals (For lockers: row/tier x column x rate = basic amount)
  const basicPrice = form.items.reduce((s, it) => {
    const isLocker = it.systemCategory === 'locker' || (it.description && it.description.toLowerCase().includes('locker'));
    const tierRows = isLocker ? (parseFloat(String(it.unit).replace(/[^0-9.]/g, '')) || 1) : 1;
    return s + tierRows * (Number(it.quantity) || 0) * (Number(it.rate) || 0);
  }, 0);

  const detectedCubicleCount = useMemo(() => {
    return form.items
      .filter(isRestroomCubicleItem)
      .reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  }, [form.items]);

  const effectiveCubicleCount = form.installationCubicleCount !== undefined && form.installationCubicleCount > 0
    ? form.installationCubicleCount
    : detectedCubicleCount;
  const effectiveInstallRate = form.installationRatePerCubicle ?? (effectiveCubicleCount > 0 && form.installationCharge ? Math.round(Number(form.installationCharge) / effectiveCubicleCount) : 1000);

  const handleSelectRatePreset = (presetRate: number) => {
    setInstallationMode('RATE');
    const cCount = form.installationCubicleCount !== undefined && form.installationCubicleCount > 0 ? form.installationCubicleCount : detectedCubicleCount;
    const tot = presetRate * cCount;
    const clause = formatInstallationTermClause('RATE', undefined, presetRate, cCount, undefined, tot);
    setForm((f) => ({
      ...f,
      installationRatePerCubicle: presetRate,
      installationCubicleCount: cCount,
      installationCharge: tot,
      installationOption: undefined,
      generalTerms: syncInstallationToGeneralTerms(f.generalTerms, clause),
    }));
    clearFieldError('installationCharge');
  };

  const handleSelectOption = (opt: string) => {
    setInstallationMode('OPTION');
    const clause = formatInstallationTermClause('OPTION', opt, undefined, undefined, form.installationCustomNote, 0);
    setForm((f) => ({
      ...f,
      installationRatePerCubicle: 0,
      installationCharge: 0,
      installationOption: opt,
      generalTerms: syncInstallationToGeneralTerms(f.generalTerms, clause),
    }));
    clearFieldError('installationCharge');
  };

  const handleInstallationModeChange = (mode: InstallationPricingMode) => {
    setInstallationMode(mode);
    if (mode === 'RATE') {
      const rate = form.installationRatePerCubicle && form.installationRatePerCubicle > 0 ? form.installationRatePerCubicle : 1000;
      const count = form.installationCubicleCount !== undefined && form.installationCubicleCount > 0 ? form.installationCubicleCount : detectedCubicleCount;
      const tot = rate * count;
      const clause = formatInstallationTermClause('RATE', undefined, rate, count, undefined, tot);
      setForm((f) => ({
        ...f,
        installationRatePerCubicle: rate,
        installationCubicleCount: count,
        installationCharge: tot,
        installationOption: undefined,
        generalTerms: syncInstallationToGeneralTerms(f.generalTerms, clause),
      }));
    } else {
      const opt = form.installationOption || 'Included';
      const clause = formatInstallationTermClause('OPTION', opt, undefined, undefined, form.installationCustomNote, 0);
      setForm((f) => ({
        ...f,
        installationRatePerCubicle: 0,
        installationCharge: 0,
        installationOption: opt,
        generalTerms: syncInstallationToGeneralTerms(f.generalTerms, clause),
      }));
    }
    clearFieldError('installationCharge');
  };

  const subtotal = basicPrice + Number(form.installationCharge || 0) + Number(form.freightAmount || 0);
  const activeGstin = form.customerGstin || null;
  const activeStateCode = form.customerStateCode || (activeGstin && activeGstin.length >= 2 ? activeGstin.slice(0, 2) : null);
  const activeStateName = form.customerStateName || null;

  const selectedCompany = companies.find((c) => c.id === form.companyProfileId) || companies[0];
  const sellerStateCode = selectedCompany?.stateCode || '07';

  const gstBreakdown = calculateGstSplit(
    subtotal,
    activeStateCode,
    activeStateName,
    Boolean(form.isSezExempt),
    Number(form.gstRate) || 18,
    activeGstin,
    form.recipientAddress,
    sellerStateCode
  );
  const gstAmount = gstBreakdown.totalTax;
  const grandTotal = gstBreakdown.grandTotal;

  const handleItemChange = (idx: number, field: keyof EditItem, value: string | number) => {
    const updated = [...form.items];
    (updated[idx] as any)[field] = value;
    setForm((f) => ({ ...f, items: updated }));
  };

  // Quick Boilerplate Presets
  const applyBoilerplatePreset = (type: 'STANDARD' | 'URINAL_PARTITION' | 'LOCKER' | 'BOARD_ONLY' | 'HARDWARE_ONLY' | 'CUSTOM_ITEM') => {
    if (type === 'STANDARD') {
      setForm((f) => ({
        ...f,
        quotationScope: 'CUBICLE',
        quotationType: 'cubicle',
        subject: 'Quotation for Supply of Restroom Cubicle System',
        title: 'Quotation for Supply of Restroom Cubicle System',
        accessoriesText: DEFAULT_ACCESSORIES_TEXT,
        items: [
          {
            systemCategory: 'cubicle',
            description: 'Pacific Restroom Cubicle System (12mm Compact Laminate)',
            unit: 'NOS',
            quantity: 1,
            rate: 18500,
            boardType: 'HPL',
            cubicleSize: '1000mm W × 1500mm D',
            boardColor: '',
            boardThickness: '12mm',
            doorSize: '600mm × 1785mm',
            overallHeight: '1980mm (incl. 100mm ground clearance)',
            hardwarePackage: 'SS 304 Stainless Steel (Satin/Brushed)',
            make: 'Pacific',
          },
        ],
      }));
      setSearchParams({ type: 'cubicle' }, { replace: true });
    } else if (type === 'BOARD_ONLY') {
      setForm((f) => ({
        ...f,
        quotationScope: 'BOARD',
        quotationType: 'custom_board',
        subject: 'Quotation for Supply of Compact Laminate / HPL Boards',
        title: 'Quotation for Supply of Compact Laminate / HPL Boards',
        warrantyText: 'We provide ten (10) years of warranty for compact laminate boards against delamination, moisture ingress, and swelling defects under standard operational use.',
        accessoriesText: '• Scope of Supply: Raw material compact laminate / HPL board sheets only.\n• Hardware & Accessories: Not included in this quotation.\n• Safe Packaging: Protected in export-grade wooden pallet crates.',
        items: [
          {
            systemCategory: 'board',
            description: '12mm High Pressure Compact Laminate (HPL) Board Sheet',
            unit: 'SQFT',
            quantity: 100,
            rate: 185,
            boardType: 'HPL',
            boardThickness: '12mm',
            boardColor: '',
            cubicleSize: '1220mm × 2440mm (4ft × 8ft)',
          },
        ],
      }));
      setSearchParams({ type: 'custom_board' }, { replace: true });
    } else if (type === 'HARDWARE_ONLY') {
      setForm((f) => ({
        ...f,
        quotationScope: 'HARDWARE',
        quotationType: 'custom_hardware',
        subject: 'Quotation for Supply of Restroom Cubicle Hardware & Accessories',
        title: 'Quotation for Supply of Restroom Cubicle Hardware & Accessories',
        warrantyText: 'We provide one (1) year replacement warranty for all stainless steel and virgin nylon hardware fittings against manufacturing defects.',
        accessoriesText: DEFAULT_ACCESSORIES_TEXT,
        items: [
          {
            systemCategory: 'hardware',
            description: 'SS 304 Gravity Hinges (Self-Closing Pair with Nylon Cam Mechanism)',
            unit: 'PAIR',
            quantity: 10,
            rate: 450,
            hardwarePackage: 'SS 304 Stainless Steel (Satin/Brushed)',
          },
          {
            systemCategory: 'hardware',
            description: 'SS 304 Occupancy Indicator Privacy Lock with Emergency Release',
            unit: 'SET',
            quantity: 5,
            rate: 650,
            hardwarePackage: 'SS 304 Stainless Steel (Satin/Brushed)',
          },
          {
            systemCategory: 'hardware',
            description: 'SS 304 Adjustable Supporting Legs (100mm to 150mm Ground Clearance)',
            unit: 'NOS',
            quantity: 10,
            rate: 350,
            hardwarePackage: 'SS 304 Stainless Steel (Satin/Brushed)',
          },
          {
            systemCategory: 'hardware',
            description: 'SS 304 Ergonomic Door Pull Handle / Knob',
            unit: 'NOS',
            quantity: 5,
            rate: 180,
            hardwarePackage: 'SS 304 Stainless Steel (Satin/Brushed)',
          },
          {
            systemCategory: 'hardware',
            description: 'SS 304 Heavy Duty Coat Hook with Integrated Rubber Buffer Stop',
            unit: 'NOS',
            quantity: 5,
            rate: 120,
            hardwarePackage: 'SS 304 Stainless Steel (Satin/Brushed)',
          },
        ],
      }));
      setSearchParams({ type: 'custom_hardware' }, { replace: true });
    } else if (type === 'CUSTOM_ITEM') {
      setForm((f) => ({
        ...f,
        quotationScope: 'CUSTOM_ITEM',
        quotationType: 'custom_item',
        subject: 'Quotation for Supply of Bespoke / Custom Architectural Items',
        title: 'Quotation for Supply of Bespoke / Custom Architectural Items',
        warrantyText: 'We provide five (5) years warranty for bespoke fabricated items against material and workmanship defects.',
        accessoriesText: '• Scope of Supply: Custom engineered architectural items and bespoke models as itemized below.\n• Fasteners & Installation Hardware: Included as per approved fabrication shop drawings.',
        items: [
          {
            systemCategory: 'custom',
            isCustom: true,
            customModelName: 'Custom Bespoke Model',
            description: 'Custom Engineered Partition & Architectural Fabricated Item',
            unit: 'NOS',
            quantity: 1,
            rate: 15000,
            boardType: 'HPL',
            cubicleSize: 'Custom Dimensions as per site drawing',
            hardwarePackage: 'Heavy-Duty Hardware Fittings',
          },
        ],
      }));
      setSearchParams({ type: 'custom_item' }, { replace: true });
    } else if (type === 'URINAL_PARTITION') {
      setForm((f) => ({
        ...f,
        quotationScope: 'CUBICLE',
        quotationType: 'cubicle',
        subject: 'Quotation for Supply of Urinal Privacy Partition Panels',
        title: 'Quotation for Supply of Urinal Privacy Partition Panels',
        items: [
          {
            systemCategory: 'ump',
            description: 'Solid Compact Laminate Urinal Privacy Divider Screen',
            unit: 'NOS',
            quantity: 1,
            rate: 5500,
            boardType: 'HPL',
            cubicleSize: '450mm W × 900mm H',
            boardColor: '',
            boardThickness: '12mm',
            doorSize: 'N/A',
            overallHeight: '900mm (wall-mounted with 300mm floor clearance)',
            hardwarePackage: 'SS 304 Stainless Steel (Satin/Brushed)',
          },
        ],
      }));
      setSearchParams({ type: 'cubicle' }, { replace: true });
    } else if (type === 'LOCKER') {
      setForm((f) => ({
        ...f,
        quotationScope: 'CUBICLE',
        quotationType: 'cubicle',
        subject: 'Quotation for Supply of Heavy Duty HPL Tier Lockers',
        title: 'Quotation for Supply of Heavy Duty HPL Tier Lockers',
        items: [
          {
            systemCategory: 'locker',
            description: 'Heavy-Duty Moisture-Resistant HPL Tier Lockers (12mm Carcass & Doors)',
            unit: '4',
            quantity: 1,
            rate: 2500,
            boardType: 'HPL',
            cubicleSize: '300mm W × 450mm D × 1800mm H',
            boardColor: '',
            boardThickness: '12mm',
            doorSize: 'Tier Configuration as per drawing',
            overallHeight: '1800mm (plus 100mm plinth base)',
            hardwarePackage: 'SS 304 Continuous Piano Hinges & Cam Locks',
          },
        ],
      }));
      setSearchParams({ type: 'cubicle' }, { replace: true });
    }
  };

  // Handle Model Selection for line item (Auto-fetches dimensions & hardware list)
  const handleSelectModel = (idx: number, modelId: string) => {
    if (!modelId) {
      setForm((f) => {
        const next = [...f.items];
        next[idx] = {
          ...next[idx],
          modelId: '',
          customModelName: '',
        };
        return { ...f, items: next };
      });
      return;
    }
    if (modelId === 'CUSTOM') {
      setForm((f) => {
        const next = [...f.items];
        next[idx] = {
          ...next[idx],
          modelId: 'CUSTOM',
          customModelName: next[idx].customModelName || '',
        };
        return { ...f, items: next };
      });
      return;
    }

    const selected = catalogModels.find((m) => m.id === modelId || m.slug === modelId);
    if (!selected) return;

    const dims = extractModelDimensions(selected);

    setForm((f) => {
      const nextItems = [...f.items];
      nextItems[idx] = {
        ...nextItems[idx],
        modelId: selected.id,
        customModelName: selected.title,
        systemCategory: 'cubicle' as const,
        description: `Pacific ${selected.title} (${selected.category})`,
        cubicleSize: dims.cubicleSize,
        doorSize: dims.doorSize,
        overallHeight: dims.overallHeight,
        boardThickness: dims.boardThickness,
        boardType: dims.boardType,
        hardwarePackage: dims.hardwarePackage,
        make: dims.make || nextItems[idx].make || 'Pacific',
        modelImageUrl: selected.imageUrl || '',
        width: dims.width,
        depth: dims.depth,
        height: dims.height,
      };

      const cubicleItems = nextItems.filter(
        (it) => it.systemCategory !== 'ump' && it.systemCategory !== 'locker'
      );
      const selectedCubicleModels: ProductCatalogModel[] = [];
      cubicleItems.forEach((it) => {
        const mod = catalogModels.find((m) => m.id === it.modelId || m.slug === it.modelId);
        if (mod && !selectedCubicleModels.some((m) => m.id === mod.id)) {
          selectedCubicleModels.push(mod);
        }
      });

      const umpItem = nextItems.find((it) => it.systemCategory === 'ump');
      const umpModel = catalogModels.find((m) => m.id === umpItem?.modelId);
      const lockerItem = nextItems.find((it) => it.systemCategory === 'locker');
      const lockerModel = catalogModels.find((m) => m.id === lockerItem?.modelId);

      return {
        ...f,
        accessoriesText: buildQuotationAccessoriesText(selectedCubicleModels, umpModel, lockerModel),
        items: nextItems,
      };
    });

    clearFieldError(`item_${idx}_desc`);
  };

  function buildQuotationAccessoriesText(
    cubicleModelsList?: ProductCatalogModel[] | ProductCatalogModel,
    umpModel?: ProductCatalogModel,
    lockerModel?: ProductCatalogModel
  ): string {
    const cubicleModels: ProductCatalogModel[] = Array.isArray(cubicleModelsList)
      ? cubicleModelsList
      : cubicleModelsList
      ? [cubicleModelsList]
      : [];

    const parts: string[] = [];
    const hasMultipleOrAddons = cubicleModels.length > 1 || !!umpModel || !!lockerModel;

    if (cubicleModels.length === 0) {
      if (hasMultipleOrAddons) {
        parts.push(`--- RESTROOM CUBICLE HARDWARE ---\n${DEFAULT_ACCESSORIES_TEXT}`);
      } else {
        parts.push(DEFAULT_ACCESSORIES_TEXT);
      }
    } else if (cubicleModels.length === 1 && !hasMultipleOrAddons) {
      parts.push(formatModelHardwareInclusions(cubicleModels[0]));
    } else {
      cubicleModels.forEach((cm) => {
        parts.push(`--- RESTROOM CUBICLE HARDWARE (${cm.title.toUpperCase()}) ---\n${formatModelHardwareInclusions(cm)}`);
      });
    }

    if (umpModel) {
      parts.push(`--- URINAL MODESTY PARTITION HARDWARE (${umpModel.title.toUpperCase()}) ---\n${formatModelHardwareInclusions(umpModel)}`);
    }
    if (lockerModel) {
      parts.push(`--- MODULAR LOCKER HARDWARE (${lockerModel.title.toUpperCase()}) ---\n${formatModelHardwareInclusions(lockerModel)}`);
    }

    return parts.join('\n\n');
  }

  const handleSelectUmpModel = (modelId: string) => {
    if (!modelId) {
      setForm((f) => {
        const nextItems = f.items.filter((it) => it.systemCategory !== 'ump' && !(it.description && (it.description.toLowerCase().includes('urinal') || it.description.toLowerCase().includes('ump'))));
        const cubicleItems = nextItems.filter((it) => it.systemCategory !== 'locker');
        const selectedCubicleModels: ProductCatalogModel[] = [];
        cubicleItems.forEach((it) => {
          const mod = catalogModels.find((m) => m.id === it.modelId || m.slug === it.modelId);
          if (mod && !selectedCubicleModels.some((m) => m.id === mod.id)) {
            selectedCubicleModels.push(mod);
          }
        });
        const lockerItem = nextItems.find((it) => it.systemCategory === 'locker');
        const lockerModel = catalogModels.find((m) => m.id === lockerItem?.modelId);
        return { ...f, items: nextItems, accessoriesText: buildQuotationAccessoriesText(selectedCubicleModels, undefined, lockerModel) };
      });
      return;
    }

    if (modelId === 'CUSTOM') {
      setForm((f) => {
        const existingUmp = f.items.find(
          (it) => it.systemCategory === 'ump' || (it.description && (it.description.toLowerCase().includes('urinal') || it.description.toLowerCase().includes('ump')))
        );
        const currentQty = existingUmp ? Number(existingUmp.quantity) || 1 : 1;
        const currentRate = existingUmp && existingUmp.rate > 0 ? existingUmp.rate : 5500;

        const updatedUmpItem: EditItem = {
          modelId: 'CUSTOM',
          customModelName: existingUmp?.customModelName || '',
          systemCategory: 'ump',
          description: existingUmp?.description || 'Pacific Custom Urinal Modesty Partition',
          quantity: currentQty,
          unit: existingUmp?.unit || 'NOS',
          rate: currentRate,
          boardType: existingUmp?.boardType || 'HPL',
          boardThickness: existingUmp?.boardThickness || '12mm',
          boardColor: existingUmp?.boardColor || '',
          cubicleSize: existingUmp?.cubicleSize || '450mm W × 900mm H',
          doorSize: 'N/A',
          overallHeight: existingUmp?.overallHeight || '1200mm',
          hardwarePackage: existingUmp?.hardwarePackage || 'Grade 304 Wall Mount Cantilever Clamps',
        };

        const remainingItems = f.items.filter((it) => it !== existingUmp && it.systemCategory !== 'ump' && !(it.description && (it.description.toLowerCase().includes('urinal') || it.description.toLowerCase().includes('ump'))));
        return { ...f, items: [...remainingItems, updatedUmpItem] };
      });
      return;
    }

    const selected = urinalModels.find((m) => m.id === modelId || m.slug === modelId) || catalogModels.find((m) => m.id === modelId);
    if (!selected) return;
    const dims = extractModelDimensions(selected);
    setForm((f) => {
      const existingUmp = f.items.find((it) => it.systemCategory === 'ump' || (it.description && (it.description.toLowerCase().includes('urinal') || it.description.toLowerCase().includes('ump'))));
      const updatedUmpItem: EditItem = {
        modelId: selected.id,
        customModelName: selected.title,
        systemCategory: 'ump',
        description: `Pacific ${selected.title} (Urinal Partitions)`,
        quantity: existingUmp ? Number(existingUmp.quantity) || 1 : 1,
        unit: existingUmp?.unit || 'NOS',
        rate: existingUmp && existingUmp.rate > 0 ? existingUmp.rate : 5500,
        boardType: dims.boardType || 'HPL',
        boardThickness: dims.boardThickness || '12mm Solid Compact Phenolic Laminate',
        boardColor: existingUmp?.boardColor || '',
        cubicleSize: dims.cubicleSize || '450mm W × 900mm H',
        doorSize: dims.doorSize || 'N/A',
        overallHeight: dims.overallHeight || '900mm (affixed 300mm above finished floor)',
        hardwarePackage: dims.hardwarePackage || 'Grade 304 Wall Mount Cantilever Clamps',
        modelImageUrl: selected.imageUrl || '',
        width: dims.width,
        depth: dims.depth,
        height: dims.height,
      };
      const remainingItems = f.items.filter((it) => it !== existingUmp && it.systemCategory !== 'ump');
      const nextItems = [...remainingItems, updatedUmpItem];
      const cubicleItems = nextItems.filter(
        (it) => it.systemCategory !== 'ump' && it.systemCategory !== 'locker'
      );
      const selectedCubicleModels: ProductCatalogModel[] = [];
      cubicleItems.forEach((it) => {
        const mod = catalogModels.find((m) => m.id === it.modelId || m.slug === it.modelId);
        if (mod && !selectedCubicleModels.some((m) => m.id === mod.id)) {
          selectedCubicleModels.push(mod);
        }
      });
      const lockerItem = nextItems.find((it) => it.systemCategory === 'locker');
      const lockerModel = catalogModels.find((m) => m.id === lockerItem?.modelId);
      return { ...f, items: nextItems, accessoriesText: buildQuotationAccessoriesText(selectedCubicleModels, selected, lockerModel) };
    });
  };

  const handleUmpFieldChange = (field: keyof EditItem, val: any) => {
    setForm((f) => {
      const idx = f.items.findIndex((it) => it.systemCategory === 'ump' || (it.description && (it.description.toLowerCase().includes('urinal') || it.description.toLowerCase().includes('ump'))));
      if (idx === -1) return f;
      const nextItems = [...f.items];
      nextItems[idx] = { ...nextItems[idx], [field]: val };
      return { ...f, items: nextItems };
    });
  };

  const handleSelectLockerModel = (modelId: string) => {
    if (!modelId) {
      setForm((f) => {
        const nextItems = f.items.filter((it) => it.systemCategory !== 'locker' && !(it.description && (it.description.toLowerCase().includes('locker'))));
        const cubicleItems = nextItems.filter((it) => it.systemCategory !== 'ump');
        const selectedCubicleModels: ProductCatalogModel[] = [];
        cubicleItems.forEach((it) => {
          const mod = catalogModels.find((m) => m.id === it.modelId || m.slug === it.modelId);
          if (mod && !selectedCubicleModels.some((m) => m.id === mod.id)) {
            selectedCubicleModels.push(mod);
          }
        });
        const umpItem = nextItems.find((it) => it.systemCategory === 'ump');
        const umpModel = catalogModels.find((m) => m.id === umpItem?.modelId);
        return { ...f, items: nextItems, accessoriesText: buildQuotationAccessoriesText(selectedCubicleModels, umpModel, undefined) };
      });
      return;
    }

    if (modelId === 'CUSTOM') {
      setForm((f) => {
        const existingLocker = f.items.find(
          (it) => it.systemCategory === 'locker' || (it.description && it.description.toLowerCase().includes('locker'))
        );
        const currentQty = existingLocker ? Number(existingLocker.quantity) || 1 : 1;
        const currentRate = existingLocker && existingLocker.rate > 0 ? existingLocker.rate : 14500;

        const updatedLockerItem: EditItem = {
          modelId: 'CUSTOM',
          customModelName: existingLocker?.customModelName || '',
          systemCategory: 'locker',
          description: existingLocker?.description || 'Pacific Custom Modular Lockers',
          quantity: currentQty,
          unit: existingLocker?.unit || 'NOS',
          rate: currentRate,
          boardType: existingLocker?.boardType || 'HPL',
          boardThickness: existingLocker?.boardThickness || '12mm',
          boardColor: existingLocker?.boardColor || '',
          cubicleSize: existingLocker?.cubicleSize || '300mm W × 450mm D × 1800mm H',
          doorSize: existingLocker?.doorSize || 'Tier Modular Doors as per drawing',
          overallHeight: existingLocker?.overallHeight || '1900mm',
          hardwarePackage: existingLocker?.hardwarePackage || 'Heavy-Duty Uniform Standard Locker Hardware',
        };

        const remainingItems = f.items.filter((it) => it !== existingLocker && it.systemCategory !== 'locker');
        return { ...f, items: [...remainingItems, updatedLockerItem] };
      });
      return;
    }

    const selected = lockerModels.find((m) => m.id === modelId || m.slug === modelId) || catalogModels.find((m) => m.id === modelId);
    if (!selected) return;
    const dims = extractModelDimensions(selected);
    setForm((f) => {
      const existingLocker = f.items.find((it) => it.systemCategory === 'locker' || (it.description && it.description.toLowerCase().includes('locker')));
      const defaultTier = String(selected.rowCount || selected.tierCount || dims.rowCount || 4);
      const currentUnit = existingLocker?.unit && /^\d+$/.test(existingLocker.unit.trim()) ? existingLocker.unit.trim() : defaultTier;
      const currentQty = existingLocker ? Number(existingLocker.quantity) || 1 : (Number(selected.columnCount || dims.columnCount) || 1);
      const currentRate = existingLocker && existingLocker.rate > 0 ? existingLocker.rate : 2500;

      const updatedLockerItem: EditItem = {
        modelId: selected.id,
        customModelName: selected.title,
        systemCategory: 'locker',
        description: `Pacific ${selected.title} (Lockers)`,
        quantity: currentQty,
        unit: currentUnit,
        rate: currentRate,
        boardType: dims.boardType || 'HPL',
        boardThickness: dims.boardThickness || '12mm Solid Compact Phenolic Laminate',
        boardColor: existingLocker?.boardColor || '',
        cubicleSize: dims.cubicleSize || '300mm W × 450mm D × 1800mm H',
        doorSize: dims.doorSize || `${currentUnit} Tier Modular Doors`,
        overallHeight: dims.overallHeight || '1800mm (plus 100mm plinth base)',
        hardwarePackage: dims.hardwarePackage || 'Heavy-Duty Uniform Standard Locker Hardware',
        modelImageUrl: selected.imageUrl || '',
        width: dims.width,
        depth: dims.depth,
        height: dims.height,
      };
      const remainingItems = f.items.filter((it) => it !== existingLocker && it.systemCategory !== 'locker');
      const nextItems = [...remainingItems, updatedLockerItem];
      const cubicleItems = nextItems.filter(
        (it) => it.systemCategory !== 'ump' && it.systemCategory !== 'locker'
      );
      const selectedCubicleModels: ProductCatalogModel[] = [];
      cubicleItems.forEach((it) => {
        const mod = catalogModels.find((m) => m.id === it.modelId || m.slug === it.modelId);
        if (mod && !selectedCubicleModels.some((m) => m.id === mod.id)) {
          selectedCubicleModels.push(mod);
        }
      });
      const umpItem = nextItems.find((it) => it.systemCategory === 'ump');
      const umpModel = catalogModels.find((m) => m.id === umpItem?.modelId);
      return { ...f, items: nextItems, accessoriesText: buildQuotationAccessoriesText(selectedCubicleModels, umpModel, selected) };
    });
  };

  const handleLockerFieldChange = (field: keyof EditItem, val: any) => {
    setForm((f) => {
      const idx = f.items.findIndex((it) => it.systemCategory === 'locker' || (it.description && it.description.toLowerCase().includes('locker')));
      if (idx === -1) return f;
      const nextItems = [...f.items];
      nextItems[idx] = { ...nextItems[idx], [field]: val };
      return { ...f, items: nextItems };
    });
  };

  const [uploadingDrawing, setUploadingDrawing] = useState(false);
  const [drawingUploadError, setDrawingUploadError] = useState<string | null>(null);

  const handleDrawingUpload = async (file: File) => {
    if (!file) return;
    setUploadingDrawing(true);
    setDrawingUploadError(null);
    try {
      const cleanBaseName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
      const ext = file.name.split('.').pop() || 'pdf';
      const fileName = `drawing_${Date.now()}_${cleanBaseName}.${ext}`;

      const result = await uploadToImageKit(file, fileName, 'quotations/drawings');
      setForm((f) => ({
        ...f,
        drawingUrl: result.url,
        drawingFileName: file.name,
        drawingFileId: result.fileId,
        drawingFileSize: file.size,
      }));
    } catch (err: any) {
      console.error('Failed to upload drawing to ImageKit:', err);
      setDrawingUploadError(err.message || 'Failed to upload drawing file to ImageKit CDN');
    } finally {
      setUploadingDrawing(false);
    }
  };

  const handleRemoveDrawing = () => {
    setForm((f) => ({
      ...f,
      drawingUrl: '',
      drawingFileName: '',
      drawingFileId: '',
      drawingFileSize: 0,
    }));
  };

  const addPrimaryCubicleItem = () => {
    const newItem: EditItem = {
      systemCategory: 'cubicle',
      description: 'Pacific Restroom Cubicle System (12mm Compact Laminate)',
      unit: 'NOS',
      quantity: 1,
      rate: 18500,
      boardType: 'HPL',
      cubicleSize: '1000mm W × 1500mm D',
      boardColor: '',
      boardThickness: '12mm',
      doorSize: '600mm × 1785mm',
      overallHeight: '1980mm (incl. 100mm ground clearance)',
      hardwarePackage: 'SS 304 Stainless Steel (Satin/Brushed)',
      make: 'Pacific',
    };
    setForm((f) => ({ ...f, items: [newItem, ...f.items] }));
  };

  const addCustomModelItem = () => {
    setForm((f) => ({
      ...f,
      items: [
        ...f.items,
        {
          systemCategory: 'custom',
          modelId: 'CUSTOM',
          customModelName: '',
          description: '',
          unit: 'NOS',
          quantity: 1,
          rate: 0,
          boardType: 'HPL',
          cubicleSize: '1000mm W × 1500mm D',
          boardColor: '',
          boardThickness: '12mm',
          doorSize: '600mm × 1785mm',
          overallHeight: '1980mm (incl. 100mm ground clearance)',
          hardwarePackage: 'SS 304 Stainless Steel (Satin/Brushed)',
          make: 'Pacific',
        },
      ],
    }));
  };

  const addItem = () => {
    const defaultHardware = 'SS 304 Stainless Steel (Satin/Brushed)';
    setForm((f) => ({
      ...f,
      items: [
        ...f.items,
        {
          systemCategory: 'cubicle',
          modelId: '',
          customModelName: '',
          description: '',
          unit: 'NOS',
          quantity: 1,
          rate: 0,
          boardType: 'HPL',
          cubicleSize: '1000mm W × 1500mm D',
          boardColor: '',
          boardThickness: '12mm',
          doorSize: '600mm × 1785mm',
          overallHeight: '1980mm (incl. 100mm ground clearance)',
          hardwarePackage: defaultHardware,
          make: 'Pacific',
        },
      ],
    }));
  };

  const addBoardItem = () => {
    setForm((f) => ({
      ...f,
      items: [
        ...f.items,
        {
          systemCategory: 'board',
          description: '12mm High Pressure Compact Laminate (HPL) Board Sheet',
          unit: 'SQFT',
          quantity: 100,
          rate: 185,
          boardType: 'HPL',
          boardThickness: '12mm',
          boardColor: '',
          cubicleSize: '1220mm × 2440mm (4ft × 8ft)',
        },
      ],
    }));
  };

  const addHardwareItem = (name = '', unit = 'NOS', rate = 0) => {
    setForm((f) => ({
      ...f,
      items: [
        ...f.items,
        {
          systemCategory: 'hardware',
          description: name || 'SS 304 Restroom Cubicle Fitting',
          unit,
          quantity: 1,
          rate,
          hardwarePackage: 'SS 304 Stainless Steel (Satin/Brushed)',
        },
      ],
    }));
  };

  const removeItem = (idx: number) => {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  };

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    // Auto-resolve empty recipient or project name so user is not blocked with dummy input demands
    if (!form.recipientName.trim()) {
      const fallbackName = form.recipientCompany.trim() || 'Valued Customer';
      setForm((f) => ({ ...f, recipientName: fallbackName }));
    }

    if (form.recipientEmail && form.recipientEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.recipientEmail.trim())) {
        errs.recipientEmail = 'Please enter a valid email address (e.g. client@company.com).';
      }
    }

    if (form.recipientPhone && form.recipientPhone.trim()) {
      const phoneRegex = /^[+0-9\s-]{7,20}$/;
      if (!phoneRegex.test(form.recipientPhone.trim())) {
        errs.recipientPhone = 'Please enter a valid phone number (7-20 digits).';
      }
    }

    if (!form.projectName.trim()) {
      const fallbackProject = form.title?.trim() || form.recipientCompany?.trim() || 'Commercial Restroom Project';
      setForm((f) => ({ ...f, projectName: fallbackProject }));
    }

    if (form.isSezExempt && !form.sezCertificateRef.trim()) {
      errs.sezCertificateRef = 'SEZ Certificate Reference is required when SEZ zero-rated GST is active.';
    }

    if (form.installationCharge < 0) {
      errs.installationCharge = 'Installation charge cannot be negative.';
    }

    if (form.freightAmount < 0) {
      errs.freightAmount = 'Freight amount cannot be negative.';
    }

    if (form.items.length === 0) {
      errs.items = 'At least one line item is required.';
    } else {
      form.items.forEach((it, idx) => {
        if (!it.description.trim()) {
          const autoDesc = it.customModelName || (it.modelId ? catalogModels.find((m) => m.id === it.modelId)?.title : undefined) || 'Pacific Restroom Cubicle System';
          it.description = autoDesc;
        }
        if (it.quantity <= 0) {
          errs[`item_${idx}_qty`] = `Item #${idx + 1} quantity must be greater than 0.`;
        }
        if (it.rate < 0) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!validateForm()) {
      alert('Please fill in all required fields and correct the errors marked in red.');
      return;
    }
    setSaving(true);
    try {
      const currentClause = formatInstallationTermClause(
        installationMode,
        form.installationOption,
        form.installationRatePerCubicle,
        form.installationCubicleCount || detectedCubicleCount,
        form.installationCustomNote,
        form.installationCharge
      );
      const syncedGeneralTerms = syncInstallationToGeneralTerms(form.generalTerms, currentClause);

      const cleanedOtherTerms = (form.otherTerms || '').replace(/\[QUOTATION_SCOPE:[^\]]+\]\s*/g, '').trim();
      const currentScope = form.quotationScope || 'CUBICLE';
      const syncedOtherTerms = `[QUOTATION_SCOPE:${currentScope}] ${cleanedOtherTerms}`.trim();

      await salesQuotationsApi.update(id, {
        ...form,
        quotationScope: currentScope,
        quotationType: scopeToType(currentScope),
        generalTerms: syncedGeneralTerms,
        otherTerms: syncedOtherTerms,
        drawingUrl: form.drawingUrl || undefined,
        drawingFileName: form.drawingFileName || undefined,
        drawingFileId: form.drawingFileId || undefined,
        items: form.items.map((it, idx) => {
          const resolvedModelName = it.customModelName || (it.modelId && it.modelId !== 'CUSTOM' ? catalogModels.find((m) => m.id === it.modelId)?.title : undefined) || undefined;
          let finalDesc = it.description;
          if ((it.systemCategory === 'custom' || it.modelId === 'CUSTOM' || it.isCustom) && it.customModelName) {
            if (!finalDesc) {
              finalDesc = it.customModelName;
            } else if (!finalDesc.includes(it.customModelName)) {
              finalDesc = `${it.customModelName} - ${finalDesc}`;
            }
          }
          const isLocker = it.systemCategory === 'locker' || (it.description && it.description.toLowerCase().includes('locker'));
          const tierRows = isLocker ? (parseFloat(String(it.unit).replace(/[^0-9.]/g, '')) || 1) : 1;
          const qty = Number(it.quantity);
          const rate = Number(it.rate);
          const amount = isLocker ? (tierRows * qty * rate) : (qty * rate);

          return {
            ...it,
            serialNumber: idx + 1,
            customModelName: resolvedModelName,
            modelName: resolvedModelName,
            modelId: it.modelId || undefined,
            description: finalDesc,
            unit: it.unit || (isLocker ? '4' : 'NOS'),
            quantity: qty,
            rate: rate,
            amount: amount,
            boardType: it.boardType || (currentScope === 'HARDWARE' ? undefined : 'HPL'),
            cubicleSize: it.cubicleSize || undefined,
            boardColor: it.boardColor || undefined,
            boardThickness: it.boardThickness || undefined,
            doorSize: it.doorSize || undefined,
            overallHeight: it.overallHeight || undefined,
            hardwarePackage: it.hardwarePackage || undefined,
            make: it.make || undefined,
            modelImageUrl: it.modelImageUrl || undefined,
            customSpecsJson: {
              ...(typeof (it as any).customSpecsJson === 'object' ? (it as any).customSpecsJson : {}),
              customModelName: resolvedModelName,
              modelName: resolvedModelName,
              modelImageUrl: it.modelImageUrl || undefined,
              systemCategory: it.systemCategory || (it.modelId === 'CUSTOM' ? 'custom' : undefined),
              isCustom: Boolean(it.isCustom || it.modelId === 'CUSTOM' || it.systemCategory === 'custom'),
              hardwarePackage: it.hardwarePackage || it.hardwareType || undefined,
              hardwareType: it.hardwareType || it.hardwarePackage || undefined,
              boardType: it.boardType || it.boardMaterial || (currentScope === 'HARDWARE' ? undefined : 'HPL'),
              boardMaterial: it.boardMaterial || it.boardType || undefined,
              colorFinish: it.colorFinish || it.boardColor || undefined,
              boardColor: it.boardColor || it.colorFinish || undefined,
              width: it.width || undefined,
              depth: it.depth || undefined,
              height: it.height || undefined,
              notes: it.notes || undefined,
              hsnSac: it.hsnSac || undefined,
              make: it.make || undefined,
              quotationScope: currentScope,
              quotationType: scopeToType(currentScope),
            },
          };
        }),
        validUntil: form.validUntil || undefined,
        installationCharge: installationMode === 'RATE' ? (Number(form.installationCharge) || 0) : 0,
        installationRatePerCubicle: installationMode === 'RATE' && Number(form.installationCharge) > 0 ? (form.installationRatePerCubicle ?? 1000) : undefined,
        installationCubicleCount: Number(form.installationCharge) > 0 ? (form.installationCubicleCount || detectedCubicleCount || undefined) : undefined,
        installationOption: installationMode === 'OPTION' ? (form.installationOption || 'Included') : undefined,
        installationCustomNote: installationMode === 'OPTION' && form.installationOption === 'Custom' ? form.installationCustomNote : undefined,
        freightAmount: Number(form.freightAmount),
        gstRate: Number(form.gstRate),
        revisionReason: revisionReason.trim() || undefined,
      });
      if (id) localStorage.removeItem(getStorageKey(id));
      navigate(`/admin/dashboard/sales-quotations/${id}`);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#7FB706] transition-colors';
  const labelCls = 'block text-xs font-semibold text-gray-400 mb-1';
  const getInputCls = (key: string) =>
    fieldErrors[key]
      ? 'w-full bg-[#0a0a1a] border border-red-500 rounded-xl p-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-400 transition-colors'
      : inputCls;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-[#7FB706] animate-spin mx-auto" />
          <p className="text-gray-400 text-sm">Loading quotation for editing...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
          <p className="text-red-400 text-sm">{error}</p>
          <Link
            to="/admin/dashboard/sales-quotations"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 text-gray-300 rounded-xl text-sm hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4" /> Back to List
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            to={`/admin/dashboard/sales-quotations/${id}`}
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Detail
          </Link>
          <div className="flex items-center gap-3 mt-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-white">Edit Quotation</h1>
                {form.quotationScope === 'HARDWARE' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                    <Wrench className="w-3 h-3 text-cyan-400" /> Custom Hardware Module
                  </span>
                ) : form.quotationScope === 'BOARD' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    <Package className="w-3 h-3 text-amber-400" /> Custom Board Module
                  </span>
                ) : form.quotationScope === 'CUSTOM_ITEM' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    <Sparkles className="w-3 h-3 text-indigo-400" /> Custom Item Module
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#7FB706]/15 text-[#7FB706] border border-[#7FB706]/30">
                    <Layers className="w-3 h-3 text-[#7FB706]" /> Cubicle Module
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400 font-mono">{quotationNum}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {lastSaved && (
            <span className="text-xs text-gray-500 hidden sm:block">
              Draft saved {lastSaved.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            type="button"
            onClick={resetDraft}
            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
            title="Discard draft and reload from server"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold rounded-xl text-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* ── Document Flow Timeline (Stage 01) ───────────────────── */}
      <DocumentFlowTimeline
        currentStage={1}
        linkedDocs={{
          quotationId: id,
          quotationRef: quotationNum,
        }}
        advanceInfo={{
          grandTotal,
          advanceRequired: Math.round(grandTotal * 0.5),
          advancePaymentStatus: 'DRAFT',
        }}
      />

      {/* Document Version Control Notice */}
      <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
            <History className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-white flex items-center gap-2 flex-wrap">
              <span>Document Version Control &amp; PDF Archiving Active</span>
              <span className="font-mono px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
                Current: Rev {String(currentRevNum).padStart(2, '0')}
              </span>
              <span className="text-gray-400">→</span>
              <span className="font-mono px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                New: Rev {String(currentRevNum + 1).padStart(2, '0')}
              </span>
            </div>
            <p className="text-gray-400 mt-0.5 text-[11px]">
              Saving edits automatically creates an immutable revision snapshot and archives its PDF. Previous versions remain accessible in the Revision History.
            </p>
          </div>
        </div>

        <div className="w-full md:w-auto shrink-0">
          <input
            type="text"
            placeholder="Revision note (optional, e.g. Price revised per client)..."
            value={revisionReason}
            onChange={(e) => setRevisionReason(e.target.value)}
            className="w-full md:w-80 bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs placeholder:text-gray-500 focus:border-indigo-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Live Total Banner */}
      <div className="bg-[#121226] border border-[#7FB706]/20 rounded-2xl px-5 py-3 flex flex-wrap items-center gap-4 text-sm">
        <div className="text-gray-400">Basic: <span className="text-white font-mono font-semibold">₹ {basicPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
        {installationMode === 'RATE' && form.installationCharge > 0 ? (
          <div className="text-gray-400">
            Installation:{' '}
            <span className="text-white font-mono font-semibold">
              ₹ {Number(form.installationCharge).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            {effectiveCubicleCount > 0 && (
              <span className="text-xs text-[#7FB706] font-mono ml-1 font-bold">
                (@ ₹ {effectiveInstallRate.toLocaleString('en-IN')}/Cubicle for {effectiveCubicleCount} Cubicle{effectiveCubicleCount === 1 ? '' : 's'})
              </span>
            )}
          </div>
        ) : (
          <div className="text-gray-400">
            Installation: <span className="text-[#7FB706] font-semibold">{form.installationOption || 'Included'}</span>
            <span className="text-xs text-slate-400 font-mono ml-1">(₹ 0.00)</span>
          </div>
        )}
        {form.freightAmount > 0 && <div className="text-gray-400">Freight: <span className="text-white font-mono font-semibold">₹ {form.freightAmount.toLocaleString('en-IN')}</span></div>}
        {gstBreakdown.isSez ? (
          <div className="text-gray-400">GST (0% SEZ): <span className="text-white font-mono font-semibold">₹ 0.00</span></div>
        ) : gstBreakdown.isDelhi ? (
          <>
            <div className="text-gray-400">CGST (9%): <span className="text-white font-mono font-semibold">₹ {gstBreakdown.cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
            <div className="text-gray-400">SGST (9%): <span className="text-white font-mono font-semibold">₹ {gstBreakdown.sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
          </>
        ) : (
          <div className="text-gray-400">IGST ({form.gstRate}%): <span className="text-white font-mono font-semibold">₹ {gstBreakdown.igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
        )}
        <div className="ml-auto font-bold text-[#7FB706] text-base font-mono">
          Total: ₹ {grandTotal.toLocaleString('en-IN')}
        </div>
      </div>

      {/* Quick Boilerplate Presets */}
      <div className="p-3.5 rounded-2xl bg-[#121226] border border-white/5 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-gray-400 flex items-center gap-1.5 font-medium">
          <Sparkles className="w-4 h-4 text-[#7FB706]" /> Quick Boilerplate Presets:
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => applyBoilerplatePreset('STANDARD')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg min-h-[36px] transition cursor-pointer ${
              (!form.quotationScope || form.quotationScope === 'CUBICLE')
                ? 'bg-[#7FB706]/20 text-[#7FB706] border border-[#7FB706]/40 font-bold'
                : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white'
            }`}
          >
            Standard Cubicle
          </button>
          <button
            type="button"
            onClick={() => applyBoilerplatePreset('URINAL_PARTITION')}
            className="px-3 py-1.5 text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg min-h-[36px] transition cursor-pointer"
          >
            Urinal Partition
          </button>
          <button
            type="button"
            onClick={() => applyBoilerplatePreset('LOCKER')}
            className="px-3 py-1.5 text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg min-h-[36px] transition cursor-pointer"
          >
            Hpl Locker
          </button>
          <button
            type="button"
            onClick={() => applyBoilerplatePreset('BOARD_ONLY')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg min-h-[36px] transition cursor-pointer ${
              form.quotationScope === 'BOARD'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white'
            }`}
          >
            Board Only
          </button>
          <button
            type="button"
            onClick={() => applyBoilerplatePreset('HARDWARE_ONLY')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg min-h-[36px] transition cursor-pointer ${
              form.quotationScope === 'HARDWARE'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white'
            }`}
          >
            Hardware Only
          </button>
          <button
            type="button"
            onClick={() => applyBoilerplatePreset('CUSTOM_ITEM')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg min-h-[36px] transition cursor-pointer ${
              form.quotationScope === 'CUSTOM_ITEM'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold'
                : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white'
            }`}
          >
            Custom Item
          </button>
        </div>
      </div>

      {/* ── Dynamic Issuing Branch & Entity Selection ───────── */}
      <BranchSelector
        companies={companies}
        selectedCompanyId={form.companyProfileId || ''}
        onSelectCompany={(compId, comp) => {
          setForm((f) => {
            let updatedTerms = f.generalTerms;
            const isKol = comp?.stateCode === '19' || comp?.entityCode === 'PPS-KOL' || (comp?.companyName || '').toLowerCase().includes('kolkata');
            if (isKol) {
              updatedTerms = updatedTerms.replace(/Ex-works New Delhi factory/gi, 'Ex-works Kolkata warehouse / factory');
            } else {
              updatedTerms = updatedTerms.replace(/Ex-works Kolkata warehouse \/ factory/gi, 'Ex-works New Delhi factory');
            }
            return {
              ...f,
              companyProfileId: compId,
              generalTerms: updatedTerms,
            };
          });
        }}
        label="Issuing Branch & Commercial Operating Entity"
        sublabel="Select which branch is issuing this quotation. Determines seller GST jurisdiction, billing address, and factory dispatch."
      />

      {/* Section 1: Recipient */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white border-b border-white/5 pb-2">Recipient Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Salutation</label>
            <select
              value={form.recipientSalutation}
              onChange={(e) => setForm((f) => ({ ...f, recipientSalutation: e.target.value }))}
              className={inputCls}
            >
              {['Mr.', 'Ms.', 'Mrs.', 'Dr.', 'M/s.', 'Sir/Madam'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Contact Name *</label>
            <input
              type="text"
              value={form.recipientName}
              onChange={(e) => {
                setForm((f) => ({ ...f, recipientName: e.target.value }));
                clearFieldError('recipientName');
              }}
              placeholder="Full name of recipient"
              className={getInputCls('recipientName')}
              required
            />
            {fieldErrors.recipientName && (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.recipientName}</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Company / Organization</label>
            <input
              type="text"
              value={form.recipientCompany}
              onChange={(e) => setForm((f) => ({ ...f, recipientCompany: e.target.value }))}
              placeholder="Company name"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Address</label>
            <input
              type="text"
              value={form.recipientAddress}
              onChange={(e) => setForm((f) => ({ ...f, recipientAddress: e.target.value }))}
              placeholder="Billing / project address"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input
              type="email"
              value={form.recipientEmail}
              onChange={(e) => {
                setForm((f) => ({ ...f, recipientEmail: e.target.value }));
                clearFieldError('recipientEmail');
              }}
              placeholder="contact@company.com"
              className={getInputCls('recipientEmail')}
            />
            {fieldErrors.recipientEmail && (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.recipientEmail}</p>
            )}
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input
              type="text"
              value={form.recipientPhone}
              onChange={(e) => {
                setForm((f) => ({ ...f, recipientPhone: e.target.value }));
                clearFieldError('recipientPhone');
              }}
              placeholder="+91 98765 43210"
              className={getInputCls('recipientPhone')}
            />
            {fieldErrors.recipientPhone && (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.recipientPhone}</p>
            )}
          </div>
        </div>
      </div>

      {/* Section 2: Project */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white border-b border-white/5 pb-2">Project & Validity</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Project Name *</label>
            <input
              type="text"
              value={form.projectName}
              onChange={(e) => {
                setForm((f) => ({ ...f, projectName: e.target.value }));
                clearFieldError('projectName');
              }}
              placeholder="e.g. Restroom Cubicles – XYZ Mall"
              className={getInputCls('projectName')}
              required
            />
            {fieldErrors.projectName && (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.projectName}</p>
            )}
          </div>
          <div>
            <label className={labelCls}>Valid Until</label>
            <input type="date" value={form.validUntil}
              onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))}
              className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Subject Line</label>
            <input type="text" value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              placeholder="Submission of Commercial Offer..." className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Quotation Title</label>
            <input type="text" value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Quotation for Supply of Toilet Cubicles" className={inputCls} />
          </div>
        </div>
      </div>

      {/* Section 3: Pricing Options */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
          <h3 className="text-sm font-bold text-white">Pricing & Commercial Terms</h3>
          <span className="text-xs text-[#7FB706] font-mono">
            {effectiveCubicleCount} Cubicle{effectiveCubicleCount === 1 ? '' : 's'} detected in items
          </span>
        </div>

        {/* Installation Charges Per Cubicle Sub-block */}
        <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <span>🔧 Installation Charges (Per Cubicle Calculation)</span>
              </label>
              {installationMode === 'OPTION' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  {form.installationOption || 'Included'}
                </span>
              )}
            </div>

            {/* Mode Switcher Tabs */}
            <div className="inline-flex items-center p-0.5 rounded-lg bg-black/40 border border-white/10">
              <button
                type="button"
                onClick={() => handleInstallationModeChange('RATE')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  installationMode === 'RATE'
                    ? 'bg-[#7FB706] text-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Rate (₹/Cubicle)
              </button>
              <button
                type="button"
                onClick={() => handleInstallationModeChange('OPTION')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  installationMode === 'OPTION'
                    ? 'bg-[#7FB706] text-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Select Option (Included, Extra to Pay, etc.)
              </button>
            </div>
          </div>

          {/* Presets Bar */}
          <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400">Rate Presets:</span>
              {RATE_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handleSelectRatePreset(p.rate)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                    installationMode === 'RATE' && form.installationRatePerCubicle === p.rate
                      ? 'bg-[#7FB706]/20 border-[#7FB706] text-[#7FB706] font-bold'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400">Non-Rated Options:</span>
              {INSTALLATION_OPTIONS.filter((o) => o.id !== 'Custom').map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectOption(opt.id)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                    installationMode === 'OPTION' && form.installationOption === opt.id
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10'
                  }`}
                >
                  {opt.badgeLabel}
                </button>
              ))}
            </div>
          </div>

          {/* Conditional Rendering based on Mode */}
          {installationMode === 'RATE' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Rate (₹ / Cubicle)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.installationRatePerCubicle ?? 1000}
                    onChange={(e) => {
                      const rate = Number(e.target.value) || 0;
                      const count = form.installationCubicleCount !== undefined && form.installationCubicleCount > 0 ? form.installationCubicleCount : detectedCubicleCount;
                      const tot = rate * count;
                      if (rate === 0) {
                        setForm((f) => ({ ...f, installationRatePerCubicle: 0, installationCharge: 0 }));
                      } else {
                        const clause = formatInstallationTermClause('RATE', undefined, rate, count, undefined, tot);
                        setForm((f) => ({
                          ...f,
                          installationRatePerCubicle: rate,
                          installationCharge: tot,
                          installationOption: undefined,
                          generalTerms: syncInstallationToGeneralTerms(f.generalTerms, clause),
                        }));
                      }
                      clearFieldError('installationCharge');
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
                    value={form.installationCubicleCount !== undefined && form.installationCubicleCount > 0 ? form.installationCubicleCount : (detectedCubicleCount || '')}
                    onChange={(e) => {
                      const count = Number(e.target.value) || 0;
                      const rate = form.installationRatePerCubicle ?? 1000;
                      const tot = rate * count;
                      const clause = formatInstallationTermClause('RATE', undefined, rate, count, undefined, tot);
                      setForm((f) => ({
                        ...f,
                        installationCubicleCount: count,
                        installationCharge: tot,
                        generalTerms: syncInstallationToGeneralTerms(f.generalTerms, clause),
                      }));
                      clearFieldError('installationCharge');
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
                    value={form.installationCharge}
                    onChange={(e) => {
                      const total = Number(e.target.value) || 0;
                      const count = form.installationCubicleCount !== undefined && form.installationCubicleCount > 0 ? form.installationCubicleCount : detectedCubicleCount;
                      const derivedRate = count > 0 ? Math.round(total / count) : 0;
                      const clause = total > 0 ? formatInstallationTermClause('RATE', undefined, derivedRate, count, undefined, total) : '';
                      setForm((f) => ({
                        ...f,
                        installationCharge: total,
                        installationRatePerCubicle: derivedRate,
                        generalTerms: total > 0 ? syncInstallationToGeneralTerms(f.generalTerms, clause) : f.generalTerms,
                      }));
                      clearFieldError('installationCharge');
                    }}
                    className={getInputCls('installationCharge')}
                  />
                  {fieldErrors.installationCharge && (
                    <p className="mt-1 text-xs text-red-400">{fieldErrors.installationCharge}</p>
                  )}
                </div>
              </div>

              {(!form.installationRatePerCubicle || form.installationRatePerCubicle === 0) && (
                <div className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300">
                  <span>💡 Rate is 0 or not charged. You can select an option below (e.g. Included, Extra to Pay):</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSelectOption('Included')}
                      className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-medium"
                    >
                      Included
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectOption('Extra to Pay')}
                      className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 font-medium"
                    >
                      Extra to Pay
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectOption('Client Scope')}
                      className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-200 hover:bg-sky-500/30 font-medium"
                    >
                      Client Scope
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Option Selected (Rate Not Selected) */
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className={labelCls}>Select Option (Rate Not Charged) *</label>
                  <select
                    value={form.installationOption || 'Included'}
                    onChange={(e) => handleSelectOption(e.target.value)}
                    className={inputCls}
                  >
                    {INSTALLATION_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id} className="bg-[#0a0a1a]">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-400">
                    {INSTALLATION_OPTIONS.find((o) => o.id === form.installationOption)?.description ||
                      'Installation term mentioned on quote'}
                  </span>
                </div>

                <div>
                  <label className={labelCls}>Cubicles (Qty Reference)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.installationCubicleCount !== undefined && form.installationCubicleCount > 0 ? form.installationCubicleCount : (detectedCubicleCount || '')}
                    onChange={(e) => {
                      const count = Number(e.target.value) || 0;
                      setForm((f) => ({ ...f, installationCubicleCount: count }));
                    }}
                    className={inputCls}
                    placeholder="Number of cubicles"
                  />
                  <span className="text-[10px] text-slate-400">
                    {detectedCubicleCount > 0
                      ? `Auto-detected: ${detectedCubicleCount} Cubicle${detectedCubicleCount === 1 ? '' : 's'}`
                      : '0 Cubicles in item list'}
                  </span>
                </div>

                <div>
                  <label className={labelCls}>Installation Cost Added</label>
                  <div className="h-10 px-3 flex items-center rounded-lg bg-black/30 border border-white/10 text-emerald-400 font-mono text-sm font-semibold">
                    ₹ 0.00 <span className="ml-2 text-xs text-slate-400 font-normal">({form.installationOption || 'Included'})</span>
                  </div>
                  <span className="text-[10px] text-slate-400">No extra charge added to total quotation price</span>
                </div>
              </div>

              {form.installationOption === 'Custom' && (
                <div>
                  <label className={labelCls}>Custom Installation Term / Scope *</label>
                  <input
                    type="text"
                    value={form.installationCustomNote || ''}
                    onChange={(e) => {
                      const note = e.target.value;
                      const clause = formatInstallationTermClause('OPTION', 'Custom', undefined, undefined, note, 0);
                      setForm((f) => ({
                        ...f,
                        installationCustomNote: note,
                        generalTerms: syncInstallationToGeneralTerms(f.generalTerms, clause),
                      }));
                    }}
                    placeholder="e.g. Extra to Pay @ actuals at site (transport & lodging extra)"
                    className={inputCls}
                  />
                  <span className="text-[10px] text-slate-400">This custom text will appear on the quotation document</span>
                </div>
              )}
            </div>
          )}

          {/* Document Mention Banner */}
          <div className="flex items-center justify-between text-xs px-3.5 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
            <span className="flex items-center gap-1.5 flex-wrap">
              <span>📄 <strong>Mentioned on document:</strong></span>
              <span className="font-medium text-white">
                {getInstallationMentionText(
                  installationMode,
                  form.installationOption,
                  form.installationRatePerCubicle,
                  effectiveCubicleCount,
                  form.installationCustomNote,
                  form.installationCharge
                )}
              </span>
            </span>
            <span className="font-mono font-bold text-white shrink-0">
              ₹ {Number(form.installationCharge).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className={labelCls}>Freight Amount (₹)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.freightAmount}
              onChange={(e) => {
                setForm((f) => ({ ...f, freightAmount: Number(e.target.value) || 0 }));
                clearFieldError('freightAmount');
              }}
              className={getInputCls('freightAmount')}
            />
            {fieldErrors.freightAmount && (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.freightAmount}</p>
            )}
          </div>
          <div>
            <label className={labelCls}>Freight Terms</label>
            <select
              value={form.freightTerms}
              onChange={(e) => setForm((f) => ({ ...f, freightTerms: e.target.value }))}
              className={inputCls}
            >
              {['Extra as Actual / To pay', 'Fixed', 'Included', 'FOB', 'CIF'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>GST Rate (%)</label>
            <select
              value={form.gstRate}
              onChange={(e) => setForm((f) => ({ ...f, gstRate: Number(e.target.value) }))}
              disabled={form.isSezExempt}
              className={inputCls + (form.isSezExempt ? ' opacity-40 cursor-not-allowed' : '')}
            >
              {[0, 5, 12, 18, 28].map((r) => (
                <option key={r} value={r}>{r}%</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="sezToggle"
            checked={form.isSezExempt}
            onChange={(e) => setForm((f) => ({ ...f, isSezExempt: e.target.checked }))}
            className="w-4 h-4 accent-[#7FB706] cursor-pointer"
          />
          <label htmlFor="sezToggle" className="text-sm text-gray-300 cursor-pointer">
            SEZ Zero-Rated (0% IGST — requires valid LUT/SEZ certificate)
          </label>
        </div>
        {form.isSezExempt && (
          <div>
            <label className={labelCls}>SEZ Certificate Reference *</label>
            <input
              type="text"
              value={form.sezCertificateRef}
              onChange={(e) => {
                setForm((f) => ({ ...f, sezCertificateRef: e.target.value }));
                clearFieldError('sezCertificateRef');
              }}
              placeholder="SEZ Certificate No. / Form-I Reference"
              className={getInputCls('sezCertificateRef')}
              required
            />
            {fieldErrors.sezCertificateRef && (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.sezCertificateRef}</p>
            )}
          </div>
        )}
      </div>

      {/* Section 4: Line Items */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#7FB706]" /> Line Items &amp; Specifications
            </h3>
            {fieldErrors.items && (
              <p className="text-xs text-red-400 mt-0.5">{fieldErrors.items}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {(!form.quotationScope || form.quotationScope === 'CUBICLE') && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    addItem();
                    clearFieldError('items');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] bg-[#7FB706]/10 hover:bg-[#7FB706]/20 text-[#7FB706] border border-[#7FB706]/30 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                  title="Add another catalog cubicle model system"
                >
                  <Plus className="w-3.5 h-3.5" />
                  ＋ Add Cubicle System
                </button>
                <button
                  type="button"
                  onClick={() => {
                    addCustomModelItem();
                    clearFieldError('items');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                  title="Write custom model name and technical specifications"
                >
                  <Plus className="w-3.5 h-3.5" />
                  ＋ Add Custom Item &amp; Model
                </button>
              </>
            )}
            {form.quotationScope === 'BOARD' && (
              <button
                type="button"
                onClick={() => {
                  addBoardItem();
                  clearFieldError('items');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Board Sheet
              </button>
            )}
            {form.quotationScope === 'HARDWARE' && (
              <button
                type="button"
                onClick={() => {
                  addHardwareItem();
                  clearFieldError('items');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-lg text-xs font-bold cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Hardware Item
              </button>
            )}
            {form.quotationScope === 'CUSTOM_ITEM' && (
              <button
                type="button"
                onClick={() => {
                  addCustomModelItem();
                  clearFieldError('items');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-bold cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Custom Item
              </button>
            )}
          </div>
        </div>

        {/* 4-Way Mode / Scope Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 bg-[#0a0a1a] rounded-xl border border-white/10">
          <button
            type="button"
            onClick={() => {
              if (form.quotationScope !== 'CUBICLE') {
                if (window.confirm('Switch quotation mode to Restroom Cubicle System?')) {
                  applyBoilerplatePreset('STANDARD');
                }
              }
            }}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              (!form.quotationScope || form.quotationScope === 'CUBICLE')
                ? 'bg-[#7FB706] text-black shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-4 h-4" /> Restroom Cubicles
          </button>
          <button
            type="button"
            onClick={() => {
              if (form.quotationScope !== 'BOARD') {
                if (window.confirm('Switch quotation mode to Board Only (HPL/HDF)? This will configure items for raw board sheet supply.')) {
                  applyBoilerplatePreset('BOARD_ONLY');
                }
              }
            }}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              form.quotationScope === 'BOARD'
                ? 'bg-[#7FB706] text-black shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Package className="w-4 h-4" /> Custom Board
          </button>
          <button
            type="button"
            onClick={() => {
              if (form.quotationScope !== 'HARDWARE') {
                if (window.confirm('Switch quotation mode to Custom Hardware Only? This will configure items for hardware fittings supply.')) {
                  applyBoilerplatePreset('HARDWARE_ONLY');
                }
              }
            }}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              form.quotationScope === 'HARDWARE'
                ? 'bg-[#7FB706] text-black shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Wrench className="w-4 h-4" /> Custom Hardware
          </button>
          <button
            type="button"
            onClick={() => {
              if (form.quotationScope !== 'CUSTOM_ITEM') {
                if (window.confirm('Switch quotation mode to Custom Item & Bespoke Works? This allows configuring custom items, bespoke models, and specialized fabrication.')) {
                  applyBoilerplatePreset('CUSTOM_ITEM');
                }
              }
            }}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              form.quotationScope === 'CUSTOM_ITEM'
                ? 'bg-[#7FB706] text-black shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-4 h-4" /> Custom Item
          </button>
        </div>

        {form.items.length === 0 && (
          <div className="text-center py-6 text-gray-500 text-sm">
            No line items yet. Click &quot;Add Item&quot; to configure quotation items.
          </div>
        )}

        <div className="space-y-5">
          {form.quotationScope === 'CUSTOM_ITEM' ? (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-indigo-300">
                <span className="flex items-center gap-2 font-medium">
                  <Sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  <span><strong>Custom Item &amp; Bespoke Works Mode Active:</strong> Configure custom items, bespoke models, vanity counters, glass partitions, and specialized fabrication freely without requiring a standard cubicle model.</span>
                </span>
                <button
                  type="button"
                  onClick={addCustomModelItem}
                  className="px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer transition self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" /> + Add Custom Item
                </button>
              </div>

              {form.items.length === 0 && (
                <div className="text-center py-8 border border-dashed border-indigo-500/30 rounded-xl bg-indigo-500/5">
                  <p className="text-xs text-gray-400 mb-3">No custom items added yet.</p>
                  <button
                    type="button"
                    onClick={addCustomModelItem}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <Plus className="w-4 h-4" /> Add First Custom Item
                  </button>
                </div>
              )}

              <div className="space-y-4">
                {form.items.map((item, idx) => (
                  <CustomQuotationItemCard
                    key={idx}
                    index={idx}
                    item={item}
                    fieldErrors={fieldErrors}
                    onChange={(field, val) => handleItemChange(idx, field as keyof EditItem, val)}
                    onRemove={() => removeItem(idx)}
                    canRemove={form.items.length > 1}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={addCustomModelItem}
                className="w-full py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-dashed border-indigo-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Another Custom Item
              </button>
            </div>
          ) : form.quotationScope === 'BOARD' ? (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-300">
                <span className="flex items-center gap-2 font-medium">
                  <Package className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span><strong>Board Supply Mode Active:</strong> Quoting for raw compact laminate / HDF sheets only. Cubicle model is not required.</span>
                </span>
                <button
                  type="button"
                  onClick={addBoardItem}
                  className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Board Sheet
                </button>
              </div>

              {form.items.map((item, idx) => {
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
                      {form.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
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
                        <label className={labelCls}>Color / Decor Code</label>
                        <input
                          type="text"
                          value={item.boardColor || ''}
                          onChange={(e) => handleItemChange(idx, 'boardColor', e.target.value)}
                          placeholder="e.g. D.No. 123 – Oyster White"
                          className={inputCls}
                        />
                      </div>

                      <div className="sm:col-span-5 space-y-1">
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

                      <div className="sm:col-span-3 space-y-1">
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
                onClick={addBoardItem}
                className="w-full py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-dashed border-amber-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Another Board Line Item
              </button>
            </div>
          ) : form.quotationScope === 'HARDWARE' ? (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-cyan-300">
                <span className="flex items-center gap-2 font-medium">
                  <Wrench className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <span><strong>Custom Hardware Only Mode Active:</strong> Quoting for individual restroom cubicle hardware fittings. Cubicle model is not required.</span>
                </span>
                <button
                  type="button"
                  onClick={() => addHardwareItem()}
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
                  { name: 'Aluminium U-Channel Wall Profile (Mtr)', unit: 'MTR', rate: 220 },
                  { name: 'Grade 304 Screws & Anchor Fasteners Pack', unit: 'SET', rate: 150 },
                ].map((hw) => (
                  <button
                    key={hw.name}
                    type="button"
                    onClick={() => addHardwareItem(hw.name, hw.unit, hw.rate)}
                    className="text-[11px] px-2 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-2.5 h-2.5" /> {hw.name}
                  </button>
                ))}
              </div>

              {form.items.map((item, idx) => {
                const lineTotal = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
                return (
                  <div key={idx} className="bg-[#0a0a1a] border border-cyan-500/30 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-cyan-400">Hardware Item #{idx + 1}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                          <Wrench className="w-3 h-3 text-cyan-400" /> Fitting / Accessory
                        </span>
                      </div>
                      {form.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="p-1 text-red-400 hover:text-red-300 cursor-pointer transition-colors"
                          title="Remove Hardware Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-6 space-y-1">
                        <label className={labelCls}>Item Name &amp; Description *</label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => {
                            handleItemChange(idx, 'description', e.target.value);
                            clearFieldError(`item_${idx}_desc`);
                          }}
                          placeholder="e.g. SS 304 Grade Privacy Lock &amp; Indicator"
                          className={getInputCls(`item_${idx}_desc`)}
                          required
                        />
                        {fieldErrors[`item_${idx}_desc`] && (
                          <p className="mt-1 text-xs text-red-400">{fieldErrors[`item_${idx}_desc`]}</p>
                        )}
                      </div>

                      <div className="sm:col-span-3 space-y-1">
                        <label className={labelCls}>Hardware Spec / Material</label>
                        <input
                          type="text"
                          value={item.hardwarePackage || ''}
                          onChange={(e) => handleItemChange(idx, 'hardwarePackage', e.target.value)}
                          placeholder="e.g. Grade 304 Stainless Steel"
                          className={inputCls}
                        />
                      </div>

                      <div className="sm:col-span-3 space-y-1">
                        <label className={labelCls}>HSN / SAC Code</label>
                        <input
                          type="text"
                          value={item.hsnSac || ''}
                          onChange={(e) => handleItemChange(idx, 'hsnSac', e.target.value)}
                          placeholder="e.g. 8302"
                          className={inputCls}
                        />
                      </div>

                      <div className="sm:col-span-3 space-y-1">
                        <label className={labelCls}>Unit</label>
                        <select
                          value={item.unit || 'NOS'}
                          onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                          className={inputCls}
                        >
                          {['NOS', 'SET', 'PAIR', 'MTR', 'KG', 'PKT', 'LOT'].map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-3 space-y-1">
                        <label className={labelCls}>Quantity *</label>
                        <input
                          type="number"
                          min="1"
                          step="1"
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

                      <div className="sm:col-span-3 space-y-1">
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

                      <div className="sm:col-span-3 space-y-1 flex flex-col justify-end">
                        <div className="text-right text-xs text-gray-400 font-mono pb-2">
                          Item Total: <span className="font-bold text-white text-sm">
                            ₹ {lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => addHardwareItem()}
                className="w-full py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-dashed border-cyan-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Another Hardware Line Item
              </button>
            </div>
          ) : (
            (() => {
            const customItems = form.items.filter(
              (it) => it.systemCategory === 'custom' || it.modelId === 'CUSTOM' || (it as any).isCustom
            );

            const primaryCubicleItem = form.items.find(
              (it) => it.systemCategory !== 'ump' && it.systemCategory !== 'locker' && it.systemCategory !== 'custom' && it.modelId !== 'CUSTOM' && !(it as any).isCustom
            );
            const primaryCubicleIdx = primaryCubicleItem ? form.items.indexOf(primaryCubicleItem) : -1;

            const umpItem = form.items.find(
              (it) => it.systemCategory === 'ump' || (it.description && (it.description.toLowerCase().includes('urinal') || it.description.toLowerCase().includes('ump')))
            );

            const lockerItem = form.items.find(
              (it) => it.systemCategory === 'locker' || (it.description && it.description.toLowerCase().includes('locker'))
            );

            const additionalCubicleItems = form.items.filter(
              (it, i) => i !== primaryCubicleIdx && it !== umpItem && it !== lockerItem && it.systemCategory !== 'custom' && it.modelId !== 'CUSTOM' && !(it as any).isCustom
            );

            return (
              <>
                {/* ── OPTIONAL CUBICLE SYSTEM (PRIMARY) ── */}
                {!primaryCubicleItem && (
                  <div className="bg-[#0a0a1a] border border-dashed border-[#7FB706]/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-[#7FB706]" />
                        Primary Cubicle System (Optional — Currently Omitted)
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        This quotation can consist solely of Custom Items, Partitions, or Bespoke Works. Click to add a standard cubicle system if needed.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addPrimaryCubicleItem}
                      className="px-3 py-1.5 bg-[#7FB706]/20 hover:bg-[#7FB706]/30 text-[#7FB706] border border-[#7FB706]/40 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> + Add Primary Cubicle System
                    </button>
                  </div>
                )}

                {/* ── PRIMARY CUBICLE SYSTEM ── */}
                {primaryCubicleItem && (
                  <div className="bg-[#0a0a1a] border border-[#7FB706]/40 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-[#7FB706]">Item #{primaryCubicleIdx + 1} (Primary System)</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#7FB706]/10 text-[#7FB706] border border-[#7FB706]/30 flex items-center gap-1">
                          <Layers className="w-3 h-3 text-[#7FB706]" /> Cubicle Model System
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#7FB706]/20 text-[#7FB706] border border-[#7FB706]/40">
                          Primary System (Optional)
                        </span>
                        {form.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(primaryCubicleIdx)}
                            className="px-2 py-0.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded flex items-center gap-1 transition-colors cursor-pointer"
                            title="Remove Primary Cubicle System (Item is Optional)"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Remove
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-3 space-y-1.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <label className={labelCls}>Product Model Selection &amp; Description (Optional)</label>
                          <span className="text-[11px] text-[#7FB706] font-medium flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Auto-fetches hardware list, sizes &amp; height
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <select
                            value={primaryCubicleItem.modelId || ''}
                            onChange={(e) => handleSelectModel(primaryCubicleIdx, e.target.value)}
                            className={inputCls + ' bg-[#161536] border-[#7FB706]/40 font-semibold'}
                          >
                            <option value="">-- Choose Product Model (Optional) --</option>
                            {standardCubicleModels.length > 0 && (
                              <optgroup label={`Standard Restroom Cubicles (${standardCubicleModels.length} Listed)`}>
                                {standardCubicleModels.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
                              </optgroup>
                            )}
                            {kidsCubicleModels.length > 0 && (
                              <optgroup label={`Kids Cubicle Models (${kidsCubicleModels.length} Listed)`}>
                                {kidsCubicleModels.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
                              </optgroup>
                            )}
                            <option value="CUSTOM">Custom / Manual Specification (Write Model)</option>
                          </select>
                          <input
                            type="text"
                            value={primaryCubicleItem.description}
                            onChange={(e) => { handleItemChange(primaryCubicleIdx, 'description', e.target.value); clearFieldError(`item_${primaryCubicleIdx}_desc`); }}
                            placeholder="Description (auto-filled on model select)"
                            className={getInputCls(`item_${primaryCubicleIdx}_desc`)}
                            required
                          />
                        </div>
                        {primaryCubicleItem.modelId === 'CUSTOM' && (
                          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row gap-2.5 items-start sm:items-center">
                            <span className="text-xs font-bold text-amber-300 whitespace-nowrap flex items-center gap-1.5">
                              <span>✍️</span> Custom Model Name:
                            </span>
                            <input
                              type="text"
                              value={primaryCubicleItem.customModelName || ''}
                              onChange={(e) => handleItemChange(primaryCubicleIdx, 'customModelName', e.target.value)}
                              placeholder="e.g. Pacific Luxe Floor-to-Ceiling / Custom Restroom Model"
                              className="flex-1 w-full bg-[#0a0a1a] border border-amber-500/40 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 font-semibold"
                            />
                            <span className="text-[11px] text-amber-300/80 italic whitespace-nowrap">Printed in PDF Model specification</span>
                          </div>
                        )}
                        {fieldErrors[`item_${primaryCubicleIdx}_desc`] && <p className="mt-1 text-xs text-red-400">{fieldErrors[`item_${primaryCubicleIdx}_desc`]}</p>}

                        <ModelImageField
                          imageUrl={primaryCubicleItem.modelImageUrl}
                          modelName={
                            primaryCubicleItem.customModelName ||
                            primaryCubicleItem.modelName ||
                            (cubicleModels.find((m) => m.id === primaryCubicleItem.modelId)?.title) ||
                            'Restroom Cubicle'
                          }
                          categoryLabel="Cubicle Model Visual"
                          onImageChange={(newUrl) => handleItemChange(primaryCubicleIdx, 'modelImageUrl', newUrl)}
                        />
                      </div>

                      <div>
                        <label className={labelCls}>Unit</label>
                        <select value={primaryCubicleItem.unit} onChange={(e) => handleItemChange(primaryCubicleIdx, 'unit', e.target.value)} className={inputCls}>
                          {['NOS', 'SET', 'SQM', 'MTR', 'RMT', 'LOT'].map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Quantity *</label>
                        <input type="number" min="0.01" step="0.01" value={primaryCubicleItem.quantity} onChange={(e) => { handleItemChange(primaryCubicleIdx, 'quantity', Number(e.target.value) || 0); clearFieldError(`item_${primaryCubicleIdx}_qty`); }} className={getInputCls(`item_${primaryCubicleIdx}_qty`)} required />
                        {fieldErrors[`item_${primaryCubicleIdx}_qty`] && <p className="mt-1 text-xs text-red-400">{fieldErrors[`item_${primaryCubicleIdx}_qty`]}</p>}
                      </div>
                      <div>
                        <label className={labelCls}>Rate (₹) *</label>
                        <input type="number" min="0" step="0.01" value={primaryCubicleItem.rate} onChange={(e) => { handleItemChange(primaryCubicleIdx, 'rate', Number(e.target.value) || 0); clearFieldError(`item_${primaryCubicleIdx}_rate`); }} className={getInputCls(`item_${primaryCubicleIdx}_rate`)} required />
                        {fieldErrors[`item_${primaryCubicleIdx}_rate`] && <p className="mt-1 text-xs text-red-400">{fieldErrors[`item_${primaryCubicleIdx}_rate`]}</p>}
                      </div>
                    </div>

                    <div className="bg-[#121226]/80 border border-white/5 rounded-xl p-3.5 space-y-3">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5"><span>⚙️</span> Cubicle Technical Specifications</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div>
                          <label className={labelCls}>Board Type *</label>
                          <select value={primaryCubicleItem.boardType || 'HPL'} onChange={(e) => handleItemChange(primaryCubicleIdx, 'boardType', e.target.value)} className={inputCls}>
                            <option value="HPL">HPL (High Pressure Compact Laminate)</option>
                            <option value="HDF">HDF (High Density Fibreboard)</option>
                          </select>
                        </div>
                        <div><label className={labelCls}>Board Thickness</label><input type="text" value={primaryCubicleItem.boardThickness || ''} onChange={(e) => handleItemChange(primaryCubicleIdx, 'boardThickness', e.target.value)} placeholder="e.g. 12mm / 18mm" className={inputCls} /></div>
                        <div><label className={labelCls}>Board Color</label><input type="text" value={primaryCubicleItem.boardColor || ''} onChange={(e) => handleItemChange(primaryCubicleIdx, 'boardColor', e.target.value)} placeholder="e.g. D.No. 123 – Oyster White" className={inputCls} /></div>
                        <div><label className={labelCls}>Cubicle Size</label><input type="text" value={primaryCubicleItem.cubicleSize || ''} onChange={(e) => handleItemChange(primaryCubicleIdx, 'cubicleSize', e.target.value)} placeholder="e.g. 1000mm W × 1500mm D" className={inputCls} /></div>
                        <div><label className={labelCls}>Door Size</label><input type="text" value={primaryCubicleItem.doorSize || ''} onChange={(e) => handleItemChange(primaryCubicleIdx, 'doorSize', e.target.value)} placeholder="e.g. 600mm × 1785mm" className={inputCls} /></div>
                        <div><label className={labelCls}>Overall Height</label><input type="text" value={primaryCubicleItem.overallHeight || ''} onChange={(e) => handleItemChange(primaryCubicleIdx, 'overallHeight', e.target.value)} placeholder="e.g. 1980mm (incl. 100mm ground clearance)" className={inputCls} /></div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className={labelCls}>Make</label>
                            <span className="text-[10px] text-gray-400 font-normal">Type or pick preset</span>
                          </div>
                          <input
                            type="text"
                            value={primaryCubicleItem.make ?? 'Pacific'}
                            onChange={(e) => handleItemChange(primaryCubicleIdx, 'make', e.target.value)}
                            placeholder="e.g. Pacific / Greenlam / Merino"
                            className={inputCls}
                          />
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {['Pacific', 'Greenlam', 'Merino', 'Stylam', 'Formica'].map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => handleItemChange(primaryCubicleIdx, 'make', preset)}
                                className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                                  (primaryCubicleItem.make ?? 'Pacific') === preset
                                    ? 'bg-[#7FB706]/20 border-[#7FB706] text-[#7FB706] font-medium'
                                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                                }`}
                              >
                                {preset}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-right text-xs text-gray-400 font-mono">
                      Line Total: <span className="font-bold text-white">₹ {((Number(primaryCubicleItem.quantity) || 0) * (Number(primaryCubicleItem.rate) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                )}

                {/* ── OPTIONAL #2: URINAL MODESTY PARTITION ── */}
                <div className={`rounded-xl p-4 space-y-3 transition-all ${umpItem ? 'bg-[#0a1826] border border-cyan-500/50' : 'bg-[#0a1826]/40 border border-cyan-500/20'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-cyan-400">Optional Section #2</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                        <Layers className="w-3 h-3 text-cyan-400" /> Urinal Modesty Partition (UMP)
                      </span>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${umpItem ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-gray-800 text-gray-400'}`}>
                      {umpItem ? '✓ Active & Included' : 'Optional / Not Selected'}
                    </span>
                  </div>
                  <div>
                    <label className={labelCls}>Urinal Partition Model Selection (Optional)</label>
                    <select value={umpItem?.modelId || ''} onChange={(e) => handleSelectUmpModel(e.target.value)} className="w-full mt-1.5 bg-[#161536] border border-cyan-500/40 rounded-xl px-3 py-2.5 text-white font-semibold text-xs focus:border-cyan-400 focus:outline-none">
                      <option value="">-- No Urinal Partitions Required (Optional) --</option>
                      {urinalModels.length > 0 && (
                        <optgroup label={`Urinal Partitions (${urinalModels.length} Listed)`}>
                          {urinalModels.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
                        </optgroup>
                      )}
                      <option value="CUSTOM">Custom / Manual Specification (Write Model)</option>
                    </select>
                  </div>
                  {umpItem && umpItem.modelId === 'CUSTOM' && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row gap-2.5 items-start sm:items-center">
                      <span className="text-xs font-bold text-amber-300 whitespace-nowrap flex items-center gap-1.5">
                        <span>✍️</span> Custom UMP Model Name:
                      </span>
                      <input
                        type="text"
                        value={umpItem.customModelName || ''}
                        onChange={(e) => handleUmpFieldChange('customModelName', e.target.value)}
                        placeholder="e.g. Pacific Custom Modesty Partition / Designer Glass UMP"
                        className="flex-1 w-full bg-[#0a0a1a] border border-amber-500/40 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 font-semibold"
                      />
                      <span className="text-[11px] text-amber-300/80 italic whitespace-nowrap">Printed in PDF Model specification</span>
                    </div>
                  )}
                  {umpItem && (
                    <ModelImageField
                      imageUrl={umpItem.modelImageUrl}
                      modelName={
                        umpItem.customModelName ||
                        (urinalModels.find((m) => m.id === umpItem.modelId)?.title) ||
                        'Urinal Modesty Partition'
                      }
                      categoryLabel="Urinal Partition Visual"
                      onImageChange={(newUrl) => handleUmpFieldChange('modelImageUrl', newUrl)}
                    />
                  )}
                  {umpItem && (
                    <div className="space-y-3 pt-2 border-t border-cyan-500/20">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className={labelCls}>Unit</label>
                          <select value={umpItem.unit} onChange={(e) => handleUmpFieldChange('unit', e.target.value)} className={inputCls}>
                            {['NOS', 'SET', 'SQM', 'MTR', 'LOT'].map((u) => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>Quantity *</label>
                          <input type="number" min="0.01" step="0.01" value={umpItem.quantity} onChange={(e) => handleUmpFieldChange('quantity', Number(e.target.value) || 0)} className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}>Rate (₹) *</label>
                          <input type="number" min="0" step="0.01" value={umpItem.rate} onChange={(e) => handleUmpFieldChange('rate', Number(e.target.value) || 0)} className={inputCls} />
                        </div>
                      </div>
                      <div className="bg-[#121226]/80 border border-white/5 rounded-xl p-3.5">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5 mb-3"><span>⚙️</span> Urinal Partition Specifications</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <div>
                            <label className={labelCls}>Board Type *</label>
                            <select value={umpItem.boardType || 'HPL'} onChange={(e) => handleUmpFieldChange('boardType', e.target.value)} className={inputCls}>
                              <option value="HPL">HPL (High Pressure Compact Laminate)</option>
                              <option value="HDF">HDF (High Density Fibreboard)</option>
                            </select>
                          </div>
                          <div><label className={labelCls}>Board Thickness</label><input type="text" value={umpItem.boardThickness || ''} onChange={(e) => handleUmpFieldChange('boardThickness', e.target.value)} placeholder="e.g. 12mm" className={inputCls} /></div>
                          <div><label className={labelCls}>Board Color</label><input type="text" value={umpItem.boardColor || ''} onChange={(e) => handleUmpFieldChange('boardColor', e.target.value)} placeholder="e.g. Oyster White" className={inputCls} /></div>
                          <div><label className={labelCls}>Partition Size</label><input type="text" value={umpItem.cubicleSize || ''} onChange={(e) => handleUmpFieldChange('cubicleSize', e.target.value)} placeholder="e.g. 450mm W × 900mm H" className={inputCls} /></div>
                          <div><label className={labelCls}>Overall Height</label><input type="text" value={umpItem.overallHeight || ''} onChange={(e) => handleUmpFieldChange('overallHeight', e.target.value)} placeholder="e.g. 1200mm" className={inputCls} /></div>
                          <div><label className={labelCls}>Hardware Package</label><input type="text" value={umpItem.hardwarePackage || ''} onChange={(e) => handleUmpFieldChange('hardwarePackage', e.target.value)} placeholder="e.g. Grade 304 Wall Mount Clamps" className={inputCls} /></div>
                        </div>
                      </div>
                      <div className="text-right font-mono text-xs text-gray-400">
                        Line Total: <span className="font-bold text-cyan-300 text-sm">₹ {((Number(umpItem.quantity) || 0) * (Number(umpItem.rate) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── OPTIONAL #3: MODULAR LOCKER SYSTEM ── */}
                <div className={`rounded-xl p-4 space-y-3 transition-all ${lockerItem ? 'bg-[#140e2b] border border-purple-500/50' : 'bg-[#140e2b]/40 border border-purple-500/20'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-purple-400">Optional Section #3</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                        <Layers className="w-3 h-3 text-purple-400" /> Modular Locker System
                      </span>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${lockerItem ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'bg-gray-800 text-gray-400'}`}>
                      {lockerItem ? '✓ Active & Included' : 'Optional / Not Selected'}
                    </span>
                  </div>
                  <div>
                    <label className={labelCls}>Modular Locker Model Selection (Optional)</label>
                    <select value={lockerItem?.modelId || ''} onChange={(e) => handleSelectLockerModel(e.target.value)} className="w-full mt-1.5 bg-[#161536] border border-purple-500/40 rounded-xl px-3 py-2.5 text-white font-semibold text-xs focus:border-purple-400 focus:outline-none">
                      <option value="">-- No Modular Lockers Required (Optional) --</option>
                      {lockerModels.length > 0 && (
                        <optgroup label={`Modular Lockers (${lockerModels.length} Listed)`}>
                          {lockerModels.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
                        </optgroup>
                      )}
                      <option value="CUSTOM">Custom / Manual Specification (Write Model)</option>
                    </select>
                  </div>
                  {lockerItem && lockerItem.modelId === 'CUSTOM' && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row gap-2.5 items-start sm:items-center">
                      <span className="text-xs font-bold text-amber-300 whitespace-nowrap flex items-center gap-1.5">
                        <span>✍️</span> Custom Locker Model Name:
                      </span>
                      <input
                        type="text"
                        value={lockerItem.customModelName || ''}
                        onChange={(e) => handleLockerFieldChange('customModelName', e.target.value)}
                        placeholder="e.g. Pacific Custom Tier Z-Lockers / Gym Locker"
                        className="flex-1 w-full bg-[#0a0a1a] border border-amber-500/40 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 font-semibold"
                      />
                      <span className="text-[11px] text-amber-300/80 italic whitespace-nowrap">Printed in PDF Model specification</span>
                    </div>
                  )}
                  {lockerItem && (
                    <ModelImageField
                      imageUrl={lockerItem.modelImageUrl}
                      modelName={
                        lockerItem.customModelName ||
                        (lockerModels.find((m) => m.id === lockerItem.modelId)?.title) ||
                        'Modular Locker'
                      }
                      categoryLabel="Modular Locker Visual"
                      onImageChange={(newUrl) => handleLockerFieldChange('modelImageUrl', newUrl)}
                    />
                  )}
                  {lockerItem && (
                    <div className="space-y-3 pt-2 border-t border-purple-500/20">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className={labelCls}>Unit (Tier / Rows) *</label>
                          <input
                            type="number"
                            min="1"
                            max="20"
                            step="1"
                            value={lockerItem.unit || ''}
                            onChange={(e) => handleLockerFieldChange('unit', e.target.value)}
                            placeholder="e.g. 4 Tiers"
                            className={inputCls}
                            required
                          />
                          <p className="text-[10px] text-purple-400/80 mt-1">Number of horizontal tiers / compartments per column (e.g. 1, 2, 3, 4, 5, 6)</p>
                        </div>
                        <div>
                          <label className={labelCls}>Quantity (Columns) *</label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={lockerItem.quantity}
                            onChange={(e) => handleLockerFieldChange('quantity', Number(e.target.value) || 0)}
                            className={inputCls}
                            required
                          />
                          <p className="text-[10px] text-purple-400/80 mt-1">Number of vertical columns / bays in locker bank</p>
                        </div>
                        <div>
                          <label className={labelCls}>Rate (₹ per Tier / Compartment) *</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={lockerItem.rate}
                            onChange={(e) => handleLockerFieldChange('rate', Number(e.target.value) || 0)}
                            className={inputCls}
                            required
                          />
                          <p className="text-[10px] text-purple-400/80 mt-1">Rate per individual tier door compartment</p>
                        </div>
                      </div>
                      <div className="bg-[#121226]/80 border border-white/5 rounded-xl p-3.5">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5 mb-3"><span>⚙️</span> Locker Technical Specifications</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <div>
                            <label className={labelCls}>Board Type *</label>
                            <select value={lockerItem.boardType || 'HPL'} onChange={(e) => handleLockerFieldChange('boardType', e.target.value)} className={inputCls}>
                              <option value="HPL">HPL (High Pressure Compact Laminate)</option>
                              <option value="HDF">HDF (High Density Fibreboard)</option>
                            </select>
                          </div>
                          <div><label className={labelCls}>Board Thickness</label><input type="text" value={lockerItem.boardThickness || ''} onChange={(e) => handleLockerFieldChange('boardThickness', e.target.value)} placeholder="e.g. 12mm" className={inputCls} /></div>
                          <div><label className={labelCls}>Board Color</label><input type="text" value={lockerItem.boardColor || ''} onChange={(e) => handleLockerFieldChange('boardColor', e.target.value)} placeholder="e.g. Oyster White" className={inputCls} /></div>
                          <div><label className={labelCls}>Locker Dimension</label><input type="text" value={lockerItem.cubicleSize || ''} onChange={(e) => handleLockerFieldChange('cubicleSize', e.target.value)} placeholder="e.g. 300mm W × 450mm D × 1800mm H" className={inputCls} /></div>
                          <div><label className={labelCls}>Door Size</label><input type="text" value={lockerItem.doorSize || ''} onChange={(e) => handleLockerFieldChange('doorSize', e.target.value)} placeholder="e.g. Tier Modular Doors as per drawing" className={inputCls} /></div>
                          <div><label className={labelCls}>Overall Height</label><input type="text" value={lockerItem.overallHeight || ''} onChange={(e) => handleLockerFieldChange('overallHeight', e.target.value)} placeholder="e.g. 1900mm" className={inputCls} /></div>
                          <div className="sm:col-span-2 lg:col-span-3"><label className={labelCls}>Hardware Package</label><input type="text" value={lockerItem.hardwarePackage || ''} onChange={(e) => handleLockerFieldChange('hardwarePackage', e.target.value)} placeholder="e.g. Master-Keyed Cam Lock, Concealed Pivot Hinges" className={inputCls} /></div>
                        </div>
                      </div>
                      {(() => {
                        const tierRows = parseFloat(String(lockerItem.unit).replace(/[^0-9.]/g, '')) || 1;
                        const cols = Number(lockerItem.quantity) || 0;
                        const rate = Number(lockerItem.rate) || 0;
                        const lockerLineTotal = tierRows * cols * rate;
                        return (
                          <div className="flex flex-wrap items-center justify-between text-xs pt-1 gap-2">
                            <span className="text-[11px] text-purple-300">
                              Locker Formula: <strong>{tierRows} Tiers (Row)</strong> × <strong>{cols} Columns</strong> × <strong>₹ {rate.toLocaleString('en-IN')}</strong> = <strong>{tierRows * cols} Total Compartments / Doors</strong>
                            </span>
                            <div className="font-mono text-xs text-gray-400">
                              Line Total: <span className="font-bold text-purple-300 text-sm">
                                ₹ {lockerLineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* ── ADDITIONAL CUBICLE SYSTEMS ── */}
                {additionalCubicleItems.map((item, addIdx) => {
                  const realIdx = form.items.indexOf(item);
                  return (
                    <div key={realIdx} className="bg-[#0a0a1a] border border-[#7FB706]/30 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-[#7FB706]">Additional System #{addIdx + 2}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#7FB706]/10 text-[#7FB706] border border-[#7FB706]/30 flex items-center gap-1">
                            <Layers className="w-3 h-3 text-[#7FB706]" /> Cubicle Model System
                          </span>
                        </div>
                        <button type="button" onClick={() => removeItem(realIdx)} className="p-1 text-red-400 hover:text-red-300 cursor-pointer transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-3 space-y-1.5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <label className={labelCls}>Cubicle Model Selection &amp; Description (Optional)</label>
                            <span className="text-[11px] text-[#7FB706] font-medium flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> Auto-fetches hardware list, sizes &amp; height
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div>
                              <select
                                value={item.modelId || ''}
                                onChange={(e) => handleSelectModel(realIdx, e.target.value)}
                                className={inputCls + ' bg-[#161536] border-[#7FB706]/40 text-white font-semibold'}
                              >
                                <option value="">-- Choose Cubicle Model (Optional) --</option>
                                {standardCubicleModels.length > 0 && (
                                  <optgroup label={`Standard Restroom Cubicles (${standardCubicleModels.length} Listed)`}>
                                    {standardCubicleModels.map((m) => (
                                      <option key={m.id} value={m.id}>
                                        {m.title}
                                      </option>
                                    ))}
                                  </optgroup>
                                )}
                                {kidsCubicleModels.length > 0 && (
                                  <optgroup label={`Kids Cubicle Models (${kidsCubicleModels.length} Listed)`}>
                                    {kidsCubicleModels.map((m) => (
                                      <option key={m.id} value={m.id}>
                                        {m.title}
                                      </option>
                                    ))}
                                  </optgroup>
                                )}
                                <option value="CUSTOM">Custom / Manual Specification (Write Model)</option>
                              </select>
                            </div>

                            <div>
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => {
                                  handleItemChange(realIdx, 'description', e.target.value);
                                  clearFieldError(`item_${realIdx}_desc`);
                                }}
                                placeholder="Description (auto-filled on model select)"
                                className={getInputCls(`item_${realIdx}_desc`)}
                                required
                              />
                            </div>
                          </div>

                          {item.modelId === 'CUSTOM' && (
                            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row gap-2.5 items-start sm:items-center">
                              <span className="text-xs font-bold text-amber-300 whitespace-nowrap flex items-center gap-1.5">
                                <span>✍️</span> Custom Model Name:
                              </span>
                              <input
                                type="text"
                                value={item.customModelName || ''}
                                onChange={(e) => {
                                  handleItemChange(realIdx, 'customModelName', e.target.value);
                                  handleItemChange(realIdx, 'modelName', e.target.value);
                                }}
                                placeholder="e.g. Pacific Luxe Floor-to-Ceiling / Custom Restroom Model"
                                className="flex-1 w-full bg-[#0a0a1a] border border-amber-500/40 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 font-semibold"
                              />
                              <span className="text-[11px] text-amber-300/80 italic whitespace-nowrap">Printed in PDF Model specification</span>
                            </div>
                          )}

                          {fieldErrors[`item_${realIdx}_desc`] && (
                            <p className="mt-1 text-xs text-red-400">{fieldErrors[`item_${realIdx}_desc`]}</p>
                          )}
                        </div>

                        <div className="sm:col-span-3">
                          <ModelImageField
                            imageUrl={item.modelImageUrl}
                            modelName={
                              item.customModelName ||
                              item.modelName ||
                              (cubicleModels.find((m) => m.id === item.modelId)?.title) ||
                              item.description ||
                              `Additional System #${addIdx + 2}`
                            }
                            categoryLabel={`System #${addIdx + 2} Model Visual`}
                            onImageChange={(newUrl) => handleItemChange(realIdx, 'modelImageUrl', newUrl)}
                          />
                        </div>

                        <div>
                          <label className={labelCls}>Unit</label>
                          <select value={item.unit} onChange={(e) => handleItemChange(realIdx, 'unit', e.target.value)} className={inputCls}>
                            {['NOS', 'SET', 'SQM', 'MTR', 'LOT'].map((u) => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>Quantity *</label>
                          <input type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => handleItemChange(realIdx, 'quantity', Number(e.target.value) || 0)} className={inputCls} required />
                        </div>
                        <div>
                          <label className={labelCls}>Rate (₹) *</label>
                          <input type="number" min="0" step="0.01" value={item.rate} onChange={(e) => handleItemChange(realIdx, 'rate', Number(e.target.value) || 0)} className={inputCls} required />
                        </div>
                      </div>

                      {/* Technical Specifications */}
                      <div className="bg-[#121226]/80 border border-white/5 rounded-xl p-3.5 space-y-3">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>⚙️</span> Technical Specifications
                          </span>
                          <span className="text-[11px] text-gray-400">Board type, dimensions &amp; colors</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <div>
                            <label className={labelCls}>Board Type *</label>
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
                            <label className={labelCls}>Cubicle Size</label>
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
                              placeholder="e.g. 1980mm (incl. 100mm ground clearance)"
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className={labelCls}>Make</label>
                              <span className="text-[10px] text-gray-400 font-normal">Type or pick preset</span>
                            </div>
                            <input
                              type="text"
                              value={item.make ?? 'Pacific'}
                              onChange={(e) => handleItemChange(realIdx, 'make', e.target.value)}
                              placeholder="e.g. Pacific / Greenlam / Merino"
                              className={inputCls}
                            />
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {['Pacific', 'Greenlam', 'Merino', 'Stylam', 'Formica'].map((preset) => (
                                <button
                                  key={preset}
                                  type="button"
                                  onClick={() => handleItemChange(realIdx, 'make', preset)}
                                  className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                                    (item.make ?? 'Pacific') === preset
                                      ? 'bg-[#7FB706]/20 border-[#7FB706] text-[#7FB706] font-medium'
                                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                                  }`}
                                >
                                  {preset}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-right text-xs text-gray-400 font-mono pt-1">
                        Line Total: <span className="font-bold text-white text-sm">
                          ₹ {((Number(item.quantity) || 0) * (Number(item.rate) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* ── SECTION 4.5: CUSTOM ITEMS & BESPOKE WORKS ── */}
                {customItems.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-amber-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                          Custom Items &amp; Bespoke Works ({customItems.length} items)
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={addCustomModelItem}
                        className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> + Add Custom Item
                      </button>
                    </div>

                    <div className="space-y-3">
                      {customItems.map((item) => {
                        const realIdx = form.items.indexOf(item);
                        return (
                          <CustomQuotationItemCard
                            key={realIdx}
                            index={realIdx}
                            item={item}
                            fieldErrors={fieldErrors}
                            onChange={(field, val) => handleItemChange(realIdx, field as keyof EditItem, val)}
                            onRemove={() => removeItem(realIdx)}
                            canRemove={true}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Bottom Quick-Action Buttons */}
                <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      addCustomModelItem();
                      clearFieldError('items');
                    }}
                    className="flex-1 min-w-[140px] py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-dashed border-amber-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400" /> + Add Custom Item
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      addItem();
                      clearFieldError('items');
                    }}
                    className="flex-1 min-w-[140px] py-2.5 bg-[#7FB706]/10 hover:bg-[#7FB706]/20 text-[#7FB706] border border-dashed border-[#7FB706]/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> + Add Cubicle System
                  </button>
                </div>
              </>
            );
          })())}
        </div>
      </div>

      {/* Section 4B: Architectural & Technical Drawing (CAD / Layout Plan) */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-[#7FB706]" />
            <h3 className="text-sm font-bold text-white">Architectural &amp; Site Drawing (CAD / Layout Plan)</h3>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            ImageKit CDN Storage
          </span>
        </div>

        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-start gap-2">
          <span className="text-sm">🔒</span>
          <div>
            <strong>Internal Technical Reference Only:</strong> Uploaded drawing is stored on ImageKit CDN for factory estimation, fabrication, and engineering reference. It is <em>strictly excluded</em> and will never appear on the customer-facing Quotation PDF.
          </div>
        </div>

        {form.drawingUrl ? (
          <div className="bg-[#0a0a1a] border border-[#7FB706]/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#7FB706]/10 border border-[#7FB706]/30 flex items-center justify-center text-[#7FB706] flex-shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">
                  {form.drawingFileName || 'Architectural_Drawing.pdf'}
                </div>
                <div className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                  {form.drawingFileSize ? <span>{(form.drawingFileSize / 1024).toFixed(1)} KB</span> : null}
                  <span className="text-[#7FB706] font-medium">✓ Uploaded to ImageKit</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <a
                href={form.drawingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-[44px] bg-[#7FB706]/15 hover:bg-[#7FB706]/25 text-[#7FB706] border border-[#7FB706]/40 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>View Drawing</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>

              <button
                type="button"
                onClick={handleRemoveDrawing}
                className="inline-flex items-center justify-center p-2.5 min-h-[44px] min-w-[44px] bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-semibold transition cursor-pointer"
                title="Remove uploaded drawing"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div>
            <label
              htmlFor="edit-drawing-file-upload"
              className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition ${
                uploadingDrawing
                  ? 'border-gray-600 bg-white/5 opacity-60 cursor-not-allowed'
                  : 'border-white/10 hover:border-[#7FB706]/50 bg-[#0a0a1a] hover:bg-white/[0.02]'
              }`}
            >
              <input
                id="edit-drawing-file-upload"
                type="file"
                className="hidden"
                accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg,.webp"
                disabled={uploadingDrawing}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleDrawingUpload(file);
                }}
              />
              <UploadCloud className={`w-8 h-8 mb-2 ${uploadingDrawing ? 'text-gray-500 animate-bounce' : 'text-[#7FB706]'}`} />
              <div className="text-sm font-semibold text-white">
                {uploadingDrawing ? 'Uploading Drawing to ImageKit CDN...' : 'Click to Upload CAD / Site Drawing'}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Supports PDF, DWG, DXF, PNG, JPG (Internal technical reference)
              </p>
            </label>

            {drawingUploadError && (
              <p className="mt-2 text-xs text-red-400 flex items-center gap-1">
                <span>⚠️</span> {drawingUploadError}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Section 5: Standard Inclusions & Hardware Accessories */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2">
          <Wrench className="w-4 h-4 text-[#7FB706]" />
          <h3 className="text-sm font-bold text-white">Standard Inclusions &amp; Hardware Accessories</h3>
        </div>

        <div>
          <label className={labelCls}>Standard Inclusions &amp; Hardware Accessories *</label>
          <textarea
            rows={5}
            value={form.accessoriesText}
            onChange={(e) => setForm((f) => ({ ...f, accessoriesText: e.target.value }))}
            placeholder="Door stoppers, gravity hinges, indicator locks, coat hooks, support shoes..."
            className={inputCls + ' font-mono text-xs leading-relaxed'}
          />
        </div>
      </div>

      {/* Section 6: Commercial Terms */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white border-b border-white/5 pb-2">Commercial Terms &amp; Conditions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Payment Terms</label>
            <textarea rows={3} value={form.paymentTerms}
              onChange={(e) => setForm((f) => ({ ...f, paymentTerms: e.target.value }))}
              placeholder="e.g. 50% advance with PO, balance before dispatch"
              className={inputCls + ' resize-none'} />
          </div>
          <div>
            <label className={labelCls}>Delivery & Lead Time</label>
            <textarea rows={3} value={form.deliveryTerms}
              onChange={(e) => setForm((f) => ({ ...f, deliveryTerms: e.target.value }))}
              placeholder="e.g. 2–3 weeks from receipt of advance"
              className={inputCls + ' resize-none'} />
          </div>
          <div>
            <label className={labelCls}>Warranty Commitment</label>
            <textarea rows={3} value={form.warrantyText}
              onChange={(e) => setForm((f) => ({ ...f, warrantyText: e.target.value }))}
              placeholder="Warranty terms..."
              className={inputCls + ' resize-none'} />
          </div>
          <div>
            <label className={labelCls}>General Terms</label>
            <textarea rows={3} value={form.generalTerms}
              onChange={(e) => setForm((f) => ({ ...f, generalTerms: e.target.value }))}
              placeholder="General commercial terms..."
              className={inputCls + ' resize-none'} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Other Terms / Notes</label>
            <textarea rows={3} value={form.otherTerms}
              onChange={(e) => setForm((f) => ({ ...f, otherTerms: e.target.value }))}
              placeholder="Any additional conditions..."
              className={inputCls + ' resize-none'} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Internal Notes (not printed on PDF)</label>
          <textarea rows={2} value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Internal remarks, negotiation notes..."
            className={inputCls + ' resize-none'} />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <Link
          to={`/admin/dashboard/sales-quotations/${id}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-sm font-semibold transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Cancel
        </Link>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-8 py-2.5 min-h-[44px] bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold rounded-xl text-sm transition-all cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving Changes...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
