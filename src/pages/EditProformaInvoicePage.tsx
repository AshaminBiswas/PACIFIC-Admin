import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Sparkles,
  CheckCircle2,
  DollarSign,
  HelpCircle,
  MapPin,
  Wrench,
  Copy,
  RotateCcw,
  AlertTriangle,
  Package,
  Boxes,
  Edit3,
  History,
} from 'lucide-react';
import { piApi } from '../api/proformaApi';
import { crmApi } from '../api/crmApi';
import { companiesApi } from '../api/companyApi';
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
import BranchSelector from '../components/common/BranchSelector';
import HsnSelectInput from '../components/common/HsnSelectInput';
import type { BusinessParty, CompanyProfile, ProductCatalogModel } from '../types/admin';
import { calculateGstSplit, isDelhiState, GST_STATE_CODE_MAP, isRestroomCubicleItem, formatStructuredAddress } from '../utils/tax';
import {
  type InstallationPricingMode,
  INSTALLATION_OPTIONS,
  RATE_PRESETS,
  getInstallationMentionText,
  formatInstallationTermClause,
  syncInstallationToPiTerms,
  detectInstallationOption,
  FREIGHT_OPTIONS,
  type FreightTermOption,
  getFreightMentionText,
  formatFreightTermClause,
  syncFreightToPiTerms,
} from '../utils/quotationInstallation';
import {
  DEFAULT_ACCESSORIES_TEXT,
  enrichPiItemForSubmission,
  type CreateItem,
  type BillingAddressData,
  type DeliveryAddressData,
  type PiScope,
} from './CreateProformaPage';
import { CustomPiItemCard } from '../components/common/CustomPiItemCard';

export default function EditProformaInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [piScope, setPiScope] = useState<PiScope>('CUBICLE');
  const [revisionReason, setRevisionReason] = useState<string>('');
  const [currentRevNum, setCurrentRevNum] = useState<number>(1);

  // Lookups
  const [customers, setCustomers] = useState<BusinessParty[]>([]);
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [catalogModels, setCatalogModels] = useState<ProductCatalogModel[]>([]);

  // Metadata
  const [piNumber, setPiNumber] = useState('');
  const [companyProfileId, setCompanyProfileId] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [customerId, setCustomerId] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('Delhi');
  const [placeOfSupplyStateCode, setPlaceOfSupplyStateCode] = useState('07');
  const [reverseCharge, setReverseCharge] = useState(false);
  const [modeOfTransport, setModeOfTransport] = useState('Road');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [grLrNumber, setGrLrNumber] = useState('');
  const [linkedPoNumber, setLinkedPoNumber] = useState('');
  const [linkedPoDate, setLinkedPoDate] = useState('');
  const [freightAmount, setFreightAmount] = useState<number>(0);
  const [freightTerms, setFreightTerms] = useState<string>('Extra as Actual / To pay');
  const [freightCustomNote, setFreightCustomNote] = useState<string>('');
  const [installationMode, setInstallationMode] = useState<InstallationPricingMode>('OPTION');
  const [installationCharge, setInstallationCharge] = useState<number>(0);
  const [installationRatePerCubicle, setInstallationRatePerCubicle] = useState<number>(1000);
  const [installationCubicleCount, setInstallationCubicleCount] = useState<number>(0);
  const [installationOption, setInstallationOption] = useState<string>('Included');
  const [installationCustomNote, setInstallationCustomNote] = useState<string>('');
  const [advancePercentage, setAdvancePercentage] = useState<number>(50);
  const [quotationId, setQuotationId] = useState<string | undefined>(undefined);
  const [quotationRef, setQuotationRef] = useState<string | undefined>(undefined);

  // Hardware & Inclusions
  const [selectedHardwarePreset, setSelectedHardwarePreset] = useState<string>('SS_304');
  const [accessoriesText, setAccessoriesText] = useState<string>(DEFAULT_ACCESSORIES_TEXT);

  // Addresses
  const [billingAddress, setBillingAddress] = useState<BillingAddressData>({
    partyName: '',
    gstin: '',
    pan: '',
    addressLine: '',
    city: '',
    pincode: '',
    state: '',
    stateCode: '',
    phone: '',
    email: '',
  });

  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddressData>({
    partyName: '',
    addressLine: '',
    city: '',
    pincode: '',
    state: '',
    stateCode: '',
    phone: '',
  });

  const [isCustomDelivery, setIsCustomDelivery] = useState(false);

  // Items & Terms
  const [items, setItems] = useState<CreateItem[]>([]);
  const [terms, setTerms] = useState<string[]>([]);
  const [newTermText, setNewTermText] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const cubicleModels = useMemo(
    () => catalogModels.filter((m) => m.category === 'Cubicle'),
    [catalogModels]
  );
  const kidsModels = useMemo(
    () => catalogModels.filter((m) => m.category === 'Kids Toilet'),
    [catalogModels]
  );
  const lockerModels = useMemo(
    () => catalogModels.filter((m) => m.category === 'Lockers'),
    [catalogModels]
  );
  const urinalModels = useMemo(
    () => catalogModels.filter((m) =>
      m.category === 'Urinal Partitions' ||
      (m.category as string) === 'Urinal Partition' ||
      m.title?.toLowerCase().includes('urinal') ||
      m.slug?.toLowerCase().includes('ump')
    ),
    [catalogModels]
  );

  // Load PI and lookups
  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [piRes, custRes, compRes, modelsList] = await Promise.all([
        piApi.getById(id),
        crmApi.listCustomers({ limit: 100 }).catch(() => ({ data: { data: { items: [] } } })),
        companiesApi.list().catch(() => ({ data: { data: [] } })),
        productCatalogApi.listModels(undefined, true).catch(() => []),
      ]);

      const data = piRes.data?.data ?? (piRes.data as any);
      setCustomers(custRes.data?.data?.items || []);
      const companyList = compRes.data?.data;
      if (companyList && companyList.length > 0) {
        setCompanies(companyList);
      }
      const availableModels = getMergedQuotationModels(modelsList || []);
      setCatalogModels(availableModels);

      setPiNumber(data.piNumber || '');
      setCurrentRevNum(data.revisionNumber || 1);
      setCompanyProfileId(data.companyProfileId || data.companyProfile?.id || (companyList && companyList[0]?.id) || '');
      setStatus(data.status || 'DRAFT');
      setCustomerId(data.customerId || '');
      setPlaceOfSupply(data.placeOfSupply || 'Delhi');
      setPlaceOfSupplyStateCode(data.placeOfSupplyStateCode || '07');
      setReverseCharge(Boolean(data.reverseCharge));
      setModeOfTransport(data.modeOfTransport || 'Road');
      setVehicleNumber(data.vehicleNumber || '');
      setGrLrNumber(data.grLrNumber || '');
      setLinkedPoNumber(data.linkedPoNumber || '');
      setLinkedPoDate(data.linkedPoDate ? new Date(data.linkedPoDate).toISOString().split('T')[0] : '');
      setFreightAmount(Number(data.freightAmount) || 0);
      setFreightTerms((data as any).freightTerms || (Number(data.freightAmount || 0) > 0 ? 'Fixed' : 'Extra as Actual / To pay'));
      setFreightCustomNote((data as any).freightCustomNote || '');
      const initInstallCharge = Number(data.installationCharge) || 0;
      setInstallationCharge(initInstallCharge);
      setInstallationRatePerCubicle(data.installationRatePerCubicle || (initInstallCharge > 0 ? Math.round(initInstallCharge / (data.installationCubicleCount || 1)) : 1000));
      setInstallationCubicleCount(data.installationCubicleCount || 0);
      setInstallationCustomNote(data.installationCustomNote || '');
      setAdvancePercentage(Number(data.advancePercentage) || 50);
      setQuotationId(data.quotationId || undefined);
      setQuotationRef(data.quotationRef || undefined);

      // Extract Parties
      const bParty = data.parties?.find((p: any) => p.partyRole === 'BILL_TO');
      const sParty = data.parties?.find((p: any) => p.partyRole === 'SHIP_TO');

      // Extract PAN & PIN from addressLine if formatted
      const bAddr = bParty?.addressLine || '';
      const panMatch = bAddr.match(/PAN:\s*([A-Z0-9]{10})/i);
      const pinMatch = bAddr.match(/PIN:\s*(\d{6})/i);
      const cleanBAddr = bAddr.replace(/,\s*(PAN:\s*[A-Z0-9]{10}|PIN:\s*\d{6})/gi, '').trim();

      const customerPan = (data.customer as any)?.pan || '';
      const bGstin = bParty?.gstin || data.customer?.gstin || '';
      const bPan = panMatch ? panMatch[1] : (customerPan || (bGstin.length === 15 ? bGstin.slice(2, 12) : ''));
      const bPincode = pinMatch ? pinMatch[1] : (data.customer?.addresses?.[0]?.postalCode || '');

      const bPartyCity = (bParty as any)?.city || data.customer?.addresses?.[0]?.city || '';
      const bPartyState = bParty?.state || data.placeOfSupply || '';
      let bPartyStateCode = bParty?.stateCode || data.placeOfSupplyStateCode || '';
      if (!bPartyStateCode && bPartyState) {
        const match = Object.entries(GST_STATE_CODE_MAP).find(([, name]) => name.toLowerCase() === bPartyState.toLowerCase());
        if (match) bPartyStateCode = match[0];
      }

      setBillingAddress({
        partyName: bParty?.partyName || data.customer?.legalName || '',
        gstin: bGstin,
        pan: bPan,
        addressLine: cleanBAddr,
        city: bPartyCity,
        pincode: bPincode,
        state: bPartyState,
        stateCode: bPartyStateCode,
        phone: bParty?.phone || data.customer?.phone || '',
        email: bParty?.email || data.customer?.email || '',
      });

      const sAddr = sParty?.addressLine || '';
      const sPinMatch = sAddr.match(/PIN:\s*(\d{6})/i);
      const cleanSAddr = sAddr.replace(/,\s*PIN:\s*\d{6}/gi, '').trim();
      const sPartyCity = (sParty as any)?.city || data.customer?.addresses?.find((a: any) => a.addressType === 'SHIPPING')?.city || bPartyCity;
      const sPartyState = sParty?.state || bParty?.state || data.placeOfSupply || '';
      let sPartyStateCode = sParty?.stateCode || bPartyStateCode || '';
      if (!sPartyStateCode && sPartyState) {
        const match = Object.entries(GST_STATE_CODE_MAP).find(([, name]) => name.toLowerCase() === sPartyState.toLowerCase());
        if (match) sPartyStateCode = match[0];
      }

      const isCustomSite = Boolean(
        sParty &&
        ((cleanSAddr && cleanBAddr && cleanSAddr !== cleanBAddr) ||
         (sParty.partyName && bParty?.partyName && sParty.partyName !== bParty.partyName) ||
         (sParty.state && bParty?.state && sParty.state !== bParty.state))
      );
      setIsCustomDelivery(isCustomSite);

      setDeliveryAddress({
        partyName: sParty?.partyName || bParty?.partyName || data.customer?.legalName || '',
        addressLine: cleanSAddr || cleanBAddr,
        city: sPartyCity,
        pincode: sPinMatch ? sPinMatch[1] : bPincode,
        state: sPartyState,
        stateCode: sPartyStateCode,
        phone: sParty?.phone || bParty?.phone || '',
      });

      // Extract Hardware Inclusions and Scope Tag from Terms
      const termsList: string[] = Array.isArray(data.terms) ? data.terms.map((t: any) => typeof t === 'string' ? t : t.text).filter(Boolean) : [];
      if (initInstallCharge > 0) {
        setInstallationMode('RATE');
        setInstallationOption(data.installationOption || 'Included');
      } else {
        setInstallationMode('OPTION');
        const detectedOpt = detectInstallationOption(termsList.join('\n'));
        setInstallationOption(data.installationOption || detectedOpt || 'Included');
      }

      const rawScopeTerm = termsList.find((t) => t.startsWith('[PI_SCOPE:'));
      const explicitScope = rawScopeTerm
        ? (rawScopeTerm.replace('[PI_SCOPE:', '').replace(']', '').trim() as PiScope)
        : null;

      const hardwareTerm = termsList.find(
        (t) =>
          t.toLowerCase().includes('hardware accessories') ||
          t.toLowerCase().includes('standard inclusions')
      );

      const officialTerms = [
        'Payment Terms: 50% Advance along with confirmed Purchase Order. Balance 50% prior to dispatch.',
        'Delivery Terms: 2-3 weeks from receipt of advance, approved shop drawings, and color confirmation.',
        'Warranty: We provide ten (10) years of warranty for partitions against any moisture-related defects and one (1) year warranty for workmanship and hardware against manufacturing defects.',
        'Goods once fabricated to custom restroom sizes cannot be cancelled or exchanged.',
        'GST and transport charges applicable as per statutory rates.',
        'Subject to Delhi/NCR jurisdiction.',
      ];

      const cleanTerms = termsList.filter((t) => {
        if (!t) return false;
        const tLower = t.toLowerCase();
        if (t.startsWith('[PI_SCOPE:') || t.startsWith('[METADATA:')) return false;
        if (
          tLower.includes('hardware accessories') ||
          tLower.includes('standard inclusions') ||
          tLower.includes('gravity hinges') ||
          tLower.includes('hardware scope')
        ) {
          return false;
        }
        if (tLower.includes('installation') && (tLower.includes('not applicable') || tLower.includes('n/a'))) {
          return false;
        }
        if (
          tLower.includes('freight charges are extra as actual') ||
          (tLower.includes('freight') && tLower.includes('extra as actual')) ||
          (tLower.includes('freight') && tLower.includes('to pay'))
        ) {
          return false;
        }
        return true;
      });

      if (cleanTerms.length > 0 && !cleanTerms.some((t) => t.toLowerCase().includes('goods once sold will not be taken back'))) {
        setTerms(cleanTerms);
      } else {
        setTerms(officialTerms);
      }

      if (hardwareTerm) {
        const cleanHw = hardwareTerm.replace(/^Standard Inclusions & Hardware Accessories:\s*/i, '').trim();
        setAccessoriesText(cleanHw);
      } else if (explicitScope === 'CUSTOM') {
        setAccessoriesText('• Scope of Supply: Customized compact laminate board sheets and precision architectural restroom hardware accessories as itemized below.');
      } else if (explicitScope === 'BOARD') {
        setAccessoriesText('• Scope of Supply: Raw material compact laminate / HPL board sheets only.\n• Hardware Accessories: Not included in this invoice scope.');
      } else if (explicitScope === 'HARDWARE') {
        setAccessoriesText('• Material: Grade 304 Stainless Steel Architectural Restroom Hardware.\n• Fasteners: Grade 304 stainless steel screws and wall anchors included.');
      }

      // Extract Items & Specifications
      if (data.items && Array.isArray(data.items)) {
        const loadedItems: CreateItem[] = [];
        let hasRealCubicleModel = false;
        let hasBoardItem = false;
        let hasHardwareItem = false;
        let hasCustomItem = false;

        data.items.forEach((it: any) => {
          const rawDesc: string = it.description || '';
          let mainDesc = rawDesc;
          let boardType = it.boardType || '';
          let boardThickness = it.boardThickness || '';
          let boardColor = it.boardColor || '';
          let cubicleSize = it.cubicleSize || '';
          let doorSize = it.doorSize || '';
          let overallHeight = it.overallHeight || '';
          let hardwarePackage = it.hardwarePackage || '';
          let make = it.make || 'Pacific';
          let parsedModel = it.customModelName || it.modelName || '';
          let parsedItemType = it.itemType || '';
          let parsedSysCat = it.systemCategory || '';

          // Parse specs from \n(Model: ... | Make: ... | Type: ... | Board: ...)
          if (rawDesc.includes('(') && rawDesc.includes(')')) {
            const specSection = rawDesc.slice(rawDesc.indexOf('(') + 1, rawDesc.lastIndexOf(')'));
            mainDesc = rawDesc.slice(0, rawDesc.indexOf('(')).trim();

            const parts = specSection.split('|').map((s) => s.trim());
            parts.forEach((p) => {
              const colonIdx = p.indexOf(':');
              if (colonIdx === -1) return;
              const k = p.substring(0, colonIdx).trim().toLowerCase();
              const v = p.substring(colonIdx + 1).trim();

              if (k === 'model') {
                if (!parsedModel) parsedModel = v;
              } else if (k === 'make') {
                make = v;
              } else if (k === 'type') {
                parsedItemType = v;
              } else if (k === 'category') {
                parsedSysCat = v;
              } else if (k.includes('board')) {
                const bTokens = v.split(' ');
                if (!boardType && bTokens[0]) boardType = bTokens[0];
                if (!boardThickness && bTokens[1]) boardThickness = bTokens.slice(1).join(' ');
              } else if (k.includes('color') && !boardColor) {
                boardColor = v;
              } else if (k.includes('size') && !cubicleSize) {
                cubicleSize = v;
              } else if (k.includes('door') && !doorSize) {
                doorSize = v;
              } else if (k.includes('height') && !overallHeight) {
                overallHeight = v;
              } else if (k.includes('hardware') && !hardwarePackage) {
                hardwarePackage = v;
              }
            });
          }

          // Separate "ModelTitle — Description" if formatted into mainDesc
          const dashMatch = mainDesc.match(/^(.*?)\s*(?:—|–|-)\s*(.*)$/);
          if (dashMatch) {
            const left = dashMatch[1].trim();
            const right = dashMatch[2].trim();
            if (right.toLowerCase().startsWith(left.toLowerCase())) {
              mainDesc = right;
              if (!parsedModel) parsedModel = left;
            } else if (left.toLowerCase() === right.toLowerCase()) {
              mainDesc = right;
            } else {
              if (!parsedModel) parsedModel = left;
              mainDesc = right;
            }
          }

          const hsnStr = String(it.hsnSac || it.hsnCode || '');
          const descLower = (mainDesc || rawDesc).toLowerCase();

          // 1. Hardware Item check
          const isHardware =
            explicitScope === 'HARDWARE' ||
            parsedItemType === 'hardware' ||
            parsedSysCat === 'hardware' ||
            it.itemType === 'hardware' ||
            it.systemCategory === 'hardware' ||
            ['8302', '7610', '3925'].includes(hsnStr) ||
            (!boardType &&
              !rawDesc.includes('Board:') &&
              ['SET', 'PAIR', 'NOS', 'PCS', 'RMT', 'LOT'].includes(it.unit) &&
              !descLower.includes('cubicle') &&
              !descLower.includes('partition') &&
              !descLower.includes('board') &&
              !descLower.includes('sheet') &&
              !descLower.includes('laminate') &&
              !descLower.includes('hpl') &&
              !descLower.includes('hdf') &&
              !descLower.includes('locker'));

          if (isHardware && explicitScope !== 'BOARD') {
            hasHardwareItem = true;
            loadedItems.push({
              id: it.id,
              itemType: 'hardware',
              systemCategory: 'hardware',
              isCustom: false,
              description: mainDesc || parsedModel,
              hardwarePackage: hardwarePackage || '',
              hsnSac: it.hsnSac || '8302',
              quantity: Number(it.quantity) || 1,
              unit: it.unit || 'SET',
              rate: Number(it.rate) || 0,
              gstRate: Number(it.gstRate ?? 18),
            });
            return;
          }

          // 2. Board Sheet check
          const isBoard =
            explicitScope === 'BOARD' ||
            parsedSysCat === 'board' ||
            it.systemCategory === 'board' ||
            ['4823', '4411'].includes(hsnStr) ||
            it.unit === 'SQFT' ||
            it.unit === 'SHEET' ||
            descLower.includes('board sheet') ||
            descLower.includes('compact laminate') ||
            ((descLower.includes('hpl') || descLower.includes('hdf') || descLower.includes('board') || descLower.includes('sheet')) &&
              !descLower.includes('cubicle') &&
              !descLower.includes('partition') &&
              !descLower.includes('locker') &&
              !doorSize &&
              !overallHeight);

          if (isBoard) {
            hasBoardItem = true;
            loadedItems.push({
              id: it.id,
              itemType: 'cubicle',
              systemCategory: 'board',
              description: mainDesc || parsedModel,
              hsnSac: it.hsnSac || '4823',
              quantity: Number(it.quantity) || 1,
              unit: it.unit || 'SQFT',
              rate: Number(it.rate) || 0,
              gstRate: Number(it.gstRate ?? 18),
              boardType: boardType || 'HPL',
              boardThickness: boardThickness || '12mm',
              boardColor: boardColor || '',
              cubicleSize: cubicleSize || '1220mm × 2440mm (4ft × 8ft)',
            });
            return;
          }

          // 2.5 Custom Item check
          const isExplicitCustom =
            explicitScope === 'CUSTOM' ||
            parsedItemType === 'custom' ||
            parsedSysCat === 'custom' ||
            it.itemType === 'custom' ||
            it.systemCategory === 'custom' ||
            it.isCustom ||
            it.modelId === 'CUSTOM' ||
            (!it.productId && parsedModel && !availableModels.some((m) => m.id === it.productId));

          if (isExplicitCustom && explicitScope !== 'CUBICLE') {
            hasCustomItem = true;
            loadedItems.push({
              id: it.id,
              itemType: 'custom',
              systemCategory: 'custom',
              isCustom: true,
              customModelName: parsedModel || mainDesc,
              description: mainDesc || parsedModel,
              hsnSac: it.hsnSac || '9403',
              quantity: Number(it.quantity) || 1,
              unit: it.unit || 'NOS',
              rate: Number(it.rate) || 0,
              gstRate: Number(it.gstRate ?? 18),
              boardType: boardType || '',
              boardThickness: boardThickness || '',
              boardColor: boardColor || '',
              cubicleSize: cubicleSize || '',
              doorSize: doorSize || '',
              overallHeight: overallHeight || '',
              hardwarePackage: hardwarePackage || '',
              make: make || 'Pacific',
            });
            return;
          }

          // 3. Standard Cubicle / Other System check
          const matchedModel = findMatchingCatalogModel(availableModels, {
            productId: it.productId,
            modelId: it.modelId,
            description: mainDesc || rawDesc,
          });

          const hasExplicitModel = Boolean(it.modelId || it.productId);
          const hasCubicleSpecs = Boolean(doorSize || overallHeight || descLower.includes('cubicle') || descLower.includes('stall'));
          const isCubicleSystem = hasExplicitModel || hasCubicleSpecs || Boolean(matchedModel && (descLower.includes('pacific') || descLower.includes('wave') || descLower.includes('delight') || descLower.includes('aura') || descLower.includes('prime')));

          if (isCubicleSystem) {
            hasRealCubicleModel = true;
          }

          const resolvedModelId = (hasExplicitModel && matchedModel?.id) ? matchedModel.id : (it.modelId || it.productId || '');
          const defaultDims = (hasExplicitModel && matchedModel) ? extractModelDimensions(matchedModel) : null;
          const resolvedTitle = mainDesc || parsedModel;
          const sysCat: 'cubicle' | 'ump' | 'locker' =
            matchedModel?.category === 'Urinal Partitions' || descLower.includes('urinal') || descLower.includes('ump')
              ? 'ump'
              : matchedModel?.category === 'Lockers' || descLower.includes('locker')
              ? 'locker'
              : 'cubicle';

          const cubicleItem: CreateItem = {
            id: it.id,
            itemType: 'cubicle',
            systemCategory: sysCat,
            modelId: resolvedModelId,
            parentModelId: resolvedModelId,
            description: resolvedTitle,
            hsnSac: it.hsnSac || '48239019',
            quantity: Number(it.quantity) || 1,
            unit: it.unit || 'NOS',
            rate: Number(it.rate) || 0,
            gstRate: Number(it.gstRate ?? 18),
            boardType: boardType || (hasExplicitModel ? defaultDims?.boardType : '') || 'HPL',
            boardThickness: boardThickness || (hasExplicitModel ? defaultDims?.boardThickness : '') || '12mm',
            boardColor: boardColor || '',
            cubicleSize: cubicleSize || (hasExplicitModel ? defaultDims?.cubicleSize : '') || '1000mm W × 1500mm D',
            doorSize: doorSize || (hasExplicitModel ? defaultDims?.doorSize : '') || '',
            overallHeight: overallHeight || (hasExplicitModel ? defaultDims?.overallHeight : '') || '',
            hardwarePackage: hardwarePackage || (hasExplicitModel ? defaultDims?.hardwarePackage : '') || '',
            make: make || 'Pacific',
          };

          loadedItems.push(cubicleItem);
        });

        // Determine detectedScope
        const finalScope: PiScope =
          explicitScope ||
          (hasCustomItem
            ? 'CUSTOM'
            : hasRealCubicleModel
            ? 'CUBICLE'
            : (hasBoardItem && hasHardwareItem)
            ? 'CUSTOM'
            : hasBoardItem
            ? 'BOARD'
            : hasHardwareItem
            ? 'HARDWARE'
            : 'CUSTOM');

        setPiScope(finalScope);
        setItems(loadedItems);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load Proforma Invoice for editing.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Customer selection auto-fill
  const handleCustomerSelect = (cId: string) => {
    setCustomerId(cId);
    const selected = customers.find((c) => c.id === cId);
    if (!selected) return;

    const billing = selected.addresses?.find((a: any) => a.addressType === 'BILLING' || a.isDefaultBilling) || selected.addresses?.[0];
    const shipping = selected.addresses?.find((a: any) => a.addressType === 'SHIPPING' || a.isDefaultShipping) || billing;

    let bState = billing?.state || (selected as any)?.state || '';
    let bStateCode = billing?.stateCode || (selected as any)?.stateCode || '';
    if (!bStateCode && selected.gstin && selected.gstin.length >= 2) {
      bStateCode = selected.gstin.slice(0, 2);
    }
    if (!bState && bStateCode && GST_STATE_CODE_MAP[bStateCode]) {
      bState = GST_STATE_CODE_MAP[bStateCode];
    }
    if (!bState) {
      bState = 'Delhi';
      bStateCode = '07';
    }

    let sState = shipping?.state || bState;
    let sStateCode = shipping?.stateCode || bStateCode;
    if (!sStateCode && sState) {
      const match = Object.entries(GST_STATE_CODE_MAP).find(([, name]) => name.toLowerCase() === sState.toLowerCase());
      if (match) sStateCode = match[0];
    }

    setPlaceOfSupply(bState);
    setPlaceOfSupplyStateCode(bStateCode);

    setBillingAddress((prev) => ({
      ...prev,
      partyName: selected.legalName || selected.tradeName || prev.partyName,
      gstin: selected.gstin || prev.gstin,
      pan: selected.pan || prev.pan,
      addressLine: [billing?.addressLine1, billing?.addressLine2].filter(Boolean).join(', ') || prev.addressLine,
      city: billing?.city || '',
      pincode: billing?.postalCode || (billing as any)?.pincode || '',
      state: bState,
      stateCode: bStateCode,
      phone: selected.phone || (selected as any).contactPhone || prev.phone,
      email: selected.email || (selected as any).contactEmail || prev.email,
    }));

    setDeliveryAddress((prev) => ({
      ...prev,
      partyName: selected.legalName || selected.tradeName || prev.partyName,
      addressLine: [shipping?.addressLine1, shipping?.addressLine2].filter(Boolean).join(', ') || [billing?.addressLine1, billing?.addressLine2].filter(Boolean).join(', ') || '',
      city: shipping?.city || billing?.city || '',
      pincode: shipping?.postalCode || (shipping as any)?.pincode || billing?.postalCode || (billing as any)?.pincode || '',
      state: sState,
      stateCode: sStateCode,
      phone: selected.phone || (selected as any).contactPhone || prev.phone,
    }));

    setIsCustomDelivery(false);
  };

  // Copy Billing Address to Delivery Address
  const handleCopyBillingToDelivery = () => {
    setDeliveryAddress({
      partyName: billingAddress.partyName,
      addressLine: billingAddress.addressLine,
      city: billingAddress.city,
      pincode: billingAddress.pincode,
      state: billingAddress.state,
      stateCode: billingAddress.stateCode,
      phone: billingAddress.phone,
    });
    setIsCustomDelivery(false);
  };

  // Clear Delivery Address for custom site entry
  const handleClearDeliveryAddress = () => {
    setDeliveryAddress({
      partyName: '',
      addressLine: '',
      city: '',
      pincode: '',
      state: '',
      stateCode: '',
      phone: '',
    });
    setIsCustomDelivery(true);
  };

  // Line item handlers
  const handleItemChange = (idx: number, field: keyof CreateItem, val: any) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  const clearFieldError = (key: string) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
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
    const qty = Number(items[idx]?.quantity) || 1;
    const modelHwItems: CreateItem[] = extractModelHardwareItems(selected, qty).map((h) => ({
      ...h,
      parentModelId: selected.id,
    }));

    setItems((prev) => {
      const current = prev[idx];
      const previousParentId = current?.modelId;

      const updatedCubicle: CreateItem = {
        ...current,
        modelId: selected.id,
        parentModelId: selected.id,
        itemType: 'cubicle',
        systemCategory: 'cubicle',
        description: `Pacific ${selected.title} (${selected.category})`,
        cubicleSize: current?.cubicleSize || dims.cubicleSize,
        doorSize: current?.doorSize || dims.doorSize,
        overallHeight: current?.overallHeight || dims.overallHeight,
        boardThickness: current?.boardThickness || dims.boardThickness,
        boardType: current?.boardType || dims.boardType,
        hardwarePackage: current?.hardwarePackage || dims.hardwarePackage,
      };

      // Filter out auto-generated hardware items previously linked to this model
      const otherItems = prev.filter((it, i) => {
        if (i === idx) return false;
        if (it.itemType === 'hardware' && !it.isCustom && previousParentId && it.parentModelId === previousParentId) {
          return false;
        }
        return true;
      });

      // Insert updated cubicle and its individual hardware items directly after it
      const before = otherItems.slice(0, idx);
      const after = otherItems.slice(idx);

      return [...before, updatedCubicle, ...modelHwItems, ...after];
    });

    setAccessoriesText(hwText);
    clearFieldError(`item_${idx}_desc`);
  };

  // ── UMP Selection & Field Change Handlers (Optional Add-on) ──
  const handleSelectUmpModel = (modelId: string) => {
    if (!modelId) {
      setItems((prev) => {
        const existingUmp = prev.find(
          (it) => it.systemCategory === 'ump' || (it.itemType !== 'hardware' && (it.description.toLowerCase().includes('urinal') || it.description.toLowerCase().includes('ump')))
        );
        const prevModelId = existingUmp?.modelId;

        const nextItems = prev.filter((it) => {
          if (it === existingUmp) return false;
          if (it.systemCategory === 'ump') return false;
          if (it.itemType !== 'hardware' && (it.description.toLowerCase().includes('urinal') || it.description.toLowerCase().includes('ump'))) return false;
          if (it.itemType === 'hardware' && prevModelId && it.parentModelId === prevModelId) return false;
          return true;
        });

        return nextItems.length > 0 ? nextItems : prev;
      });
      return;
    }

    const selected = urinalModels.find((m) => m.id === modelId || m.slug === modelId) || catalogModels.find((m) => m.id === modelId);
    if (!selected) return;

    const dims = extractModelDimensions(selected);

    setItems((prev) => {
      const existingUmp = prev.find(
        (it) => it.systemCategory === 'ump' || (it.itemType !== 'hardware' && (it.description.toLowerCase().includes('urinal') || it.description.toLowerCase().includes('ump')))
      );
      const prevModelId = existingUmp?.modelId;
      const currentQty = existingUmp ? Number(existingUmp.quantity) || 1 : 1;
      const currentRate = existingUmp && existingUmp.rate > 0 ? existingUmp.rate : 4500;
      const currentHsn = existingUmp?.hsnSac || '9403';

      const updatedUmpItem: CreateItem = {
        id: existingUmp?.id,
        modelId: selected.id,
        systemCategory: 'ump',
        itemType: 'cubicle',
        description: `Pacific ${selected.title} (Urinal Partitions)`,
        hsnSac: currentHsn,
        quantity: currentQty,
        unit: existingUmp?.unit || 'NOS',
        rate: currentRate,
        gstRate: 18,
        boardType: dims.boardType || 'HPL',
        boardThickness: dims.boardThickness || '12mm',
        boardColor: existingUmp?.boardColor || '',
        cubicleSize: dims.cubicleSize || '450mm W × 900mm H',
        doorSize: 'N/A',
        overallHeight: dims.overallHeight || '1200mm (affixed 300mm above finished floor)',
        hardwarePackage: dims.hardwarePackage || 'Grade 304 Wall Mount Cantilever Clamps',
      };

      const remainingItems = prev.filter((it) => {
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

      return [...remainingItems, updatedUmpItem, ...refreshedHw];
    });
  };

  const handleUmpFieldChange = (field: keyof CreateItem, val: any) => {
    setItems((prev) => {
      const existingUmpIdx = prev.findIndex(
        (it) => it.systemCategory === 'ump' || (it.itemType !== 'hardware' && (it.description.toLowerCase().includes('urinal') || it.description.toLowerCase().includes('ump')))
      );
      if (existingUmpIdx === -1) return prev;

      const updatedUmp = { ...prev[existingUmpIdx], [field]: val };
      const nextItems = [...prev];
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

      return nextItems;
    });
  };

  // ── Modular Locker Selection & Field Change Handlers (Optional Add-on) ──
  const handleSelectLockerModel = (modelId: string) => {
    if (!modelId) {
      setItems((prev) => {
        const existingLocker = prev.find(
          (it) => it.systemCategory === 'locker' || (it.itemType !== 'hardware' && it.description.toLowerCase().includes('locker'))
        );
        const prevModelId = existingLocker?.modelId;

        const nextItems = prev.filter((it) => {
          if (it === existingLocker) return false;
          if (it.systemCategory === 'locker') return false;
          if (it.itemType !== 'hardware' && it.description.toLowerCase().includes('locker')) return false;
          if (it.itemType === 'hardware' && prevModelId && it.parentModelId === prevModelId) return false;
          return true;
        });

        return nextItems.length > 0 ? nextItems : prev;
      });
      return;
    }

    const selected = lockerModels.find((m) => m.id === modelId || m.slug === modelId) || catalogModels.find((m) => m.id === modelId);
    if (!selected) return;

    const dims = extractModelDimensions(selected);

    setItems((prev) => {
      const existingLocker = prev.find(
        (it) => it.systemCategory === 'locker' || (it.itemType !== 'hardware' && it.description.toLowerCase().includes('locker'))
      );
      const prevModelId = existingLocker?.modelId;
      const currentQty = existingLocker ? Number(existingLocker.quantity) || 1 : 1;
      const currentRate = existingLocker && existingLocker.rate > 0 ? existingLocker.rate : 14500;
      const currentHsn = existingLocker?.hsnSac || '9403';

      const updatedLockerItem: CreateItem = {
        id: existingLocker?.id,
        modelId: selected.id,
        systemCategory: 'locker',
        itemType: 'cubicle',
        description: `Pacific ${selected.title} (Lockers)`,
        hsnSac: currentHsn,
        quantity: currentQty,
        unit: existingLocker?.unit || 'NOS',
        rate: currentRate,
        gstRate: 18,
        boardType: dims.boardType || 'HPL',
        boardThickness: dims.boardThickness || '12mm',
        boardColor: existingLocker?.boardColor || '',
        cubicleSize: dims.cubicleSize || '300mm W × 450mm D × 1800mm H',
        doorSize: dims.doorSize || 'Tier Modular Doors as per drawing',
        overallHeight: dims.overallHeight || '1900mm (including 100mm plinth base)',
        hardwarePackage: dims.hardwarePackage || 'Heavy-Duty Uniform Standard Locker Hardware',
      };

      const remainingItems = prev.filter((it) => {
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

      return [...remainingItems, updatedLockerItem, ...refreshedHw];
    });
  };

  const handleLockerFieldChange = (field: keyof CreateItem, val: any) => {
    setItems((prev) => {
      const existingLockerIdx = prev.findIndex(
        (it) => it.systemCategory === 'locker' || (it.itemType !== 'hardware' && it.description.toLowerCase().includes('locker'))
      );
      if (existingLockerIdx === -1) return prev;

      const updatedLocker = { ...prev[existingLockerIdx], [field]: val };
      const nextItems = [...prev];
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

      return nextItems;
    });
  };

  const handleAddBoardItem = () => {
    setItems((prev) => [
      ...prev,
      {
        itemType: 'cubicle',
        systemCategory: 'board',
        description: '',
        hsnSac: '4823',
        unit: 'SQFT',
        quantity: 1,
        rate: 0,
        gstRate: 18,
        boardType: 'HPL',
        boardThickness: '12mm',
        boardColor: '',
        cubicleSize: '1220mm × 2440mm (4ft × 8ft)',
      },
    ]);
  };

  const handleAddCubicleItem = () => {
    const defaultHardware = 'SS 304 Stainless Steel (Satin/Brushed)';
    setItems((prev) => [
      ...prev,
      {
        itemType: 'cubicle',
        description: '',
        hsnSac: '48239019',
        unit: 'NOS',
        quantity: 1,
        rate: 18500,
        gstRate: 18,
        boardType: 'HPL',
        boardThickness: '12mm',
        boardColor: '',
        cubicleSize: '1000mm W × 1500mm D',
        doorSize: '600mm × 1785mm',
        overallHeight: '1980mm (incl. 100mm ground clearance)',
        hardwarePackage: defaultHardware,
      },
    ]);
  };

  const handleAddHardwareItem = () => {
    setItems((prev) => [
      ...prev,
      {
        itemType: 'hardware',
        isCustom: false,
        systemCategory: 'hardware',
        description: '',
        hardwarePackage: '',
        hsnSac: '',
        unit: 'SET',
        quantity: 1,
        rate: 0,
        gstRate: 18,
      },
    ]);
  };

  const handleAddCustomItem = () => {
    setItems((prev) => [
      ...prev,
      {
        itemType: 'custom',
        isCustom: true,
        systemCategory: 'custom',
        customModelName: '',
        description: '',
        hsnSac: '9403',
        unit: 'NOS',
        quantity: 1,
        rate: 0,
        gstRate: 18,
        boardType: '',
        boardThickness: '',
        boardColor: '',
        cubicleSize: '',
        doorSize: '',
        overallHeight: '',
        hardwarePackage: '',
        make: 'Pacific',
      },
    ]);
  };

  const handleAddPrimaryCubicleItem = () => {
    setItems((prev) => [
      {
        modelId: '',
        itemType: 'cubicle',
        systemCategory: 'cubicle',
        description: 'Pacific Restroom Cubicle System (12mm Compact Laminate)',
        hsnSac: '9403',
        quantity: 1,
        unit: 'NOS',
        rate: 18500,
        gstRate: 18,
        boardType: 'HPL',
        boardThickness: '12mm',
        boardColor: '',
        cubicleSize: '1000mm W × 1500mm D',
        doorSize: '600mm × 1785mm',
        overallHeight: '1980mm (incl. 100mm ground clearance)',
        hardwarePackage: 'SS 304 Stainless Steel (Satin/Brushed)',
        make: 'Pacific',
      },
      ...prev,
    ]);
  };

  const handleAddInstallationItem = () => {
    const count = effectiveCubicleCount;
    const rate = effectiveInstallRate;
    setItems((prev) => [
      ...prev,
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
    ]);
  };

  const handleAddItem = handleAddCubicleItem;

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      alert('A Proforma Invoice must have at least one line item.');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Terms handlers
  const handleAddTerm = () => {
    if (!newTermText.trim()) return;
    setTerms((prev) => [...prev, newTermText.trim()]);
    setNewTermText('');
  };

  const handleRemoveTerm = (index: number) => {
    setTerms((prev) => prev.filter((_, i) => i !== index));
  };

  // Math Computations
  const basicPrice = items.reduce(
    (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.rate) || 0),
    0
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

  const handleSelectRatePreset = (presetRate: number) => {
    setInstallationMode('RATE');
    const cCount = installationCubicleCount !== undefined && installationCubicleCount > 0 ? installationCubicleCount : detectedCubicleCount;
    const tot = presetRate * cCount;
    const clause = formatInstallationTermClause('RATE', undefined, presetRate, cCount, undefined, tot);
    setInstallationRatePerCubicle(presetRate);
    setInstallationCubicleCount(cCount);
    setInstallationCharge(tot);
    setInstallationOption(undefined as any);
    setTerms((prev) => syncInstallationToPiTerms(prev, clause));
  };

  const handleSelectOption = (opt: string) => {
    setInstallationMode('OPTION');
    setInstallationOption(opt);
    setInstallationCharge(0);
    setInstallationRatePerCubicle(0);
    const clause = formatInstallationTermClause('OPTION', opt, undefined, undefined, installationCustomNote, 0);
    setTerms((prev) => syncInstallationToPiTerms(prev, clause));
  };

  const handleInstallationModeChange = (mode: InstallationPricingMode) => {
    setInstallationMode(mode);
    if (mode === 'RATE') {
      const rate = installationRatePerCubicle && installationRatePerCubicle > 0 ? installationRatePerCubicle : 1000;
      const count = installationCubicleCount !== undefined && installationCubicleCount > 0 ? installationCubicleCount : detectedCubicleCount;
      const tot = rate * count;
      const clause = formatInstallationTermClause('RATE', undefined, rate, count, undefined, tot);
      setInstallationRatePerCubicle(rate);
      setInstallationCubicleCount(count);
      setInstallationCharge(tot);
      setInstallationOption(undefined as any);
      setTerms((prev) => syncInstallationToPiTerms(prev, clause));
    } else {
      const opt = installationOption || 'Included';
      const clause = formatInstallationTermClause('OPTION', opt, undefined, undefined, installationCustomNote, 0);
      setInstallationCharge(0);
      setInstallationRatePerCubicle(0);
      setInstallationOption(opt);
      setTerms((prev) => syncInstallationToPiTerms(prev, clause));
    }
  };

  const handleFreightOptionChange = (opt: string) => {
    const isFixed = opt === 'Fixed';
    const newAmt = isFixed ? (Number(freightAmount) > 0 ? Number(freightAmount) : 0) : 0;
    const clause = formatFreightTermClause(opt, newAmt, freightCustomNote);
    setFreightTerms(opt);
    setFreightAmount(newAmt);
    setTerms((t) => syncFreightToPiTerms(t, clause));
  };

  const handleFreightAmountChange = (amt: number) => {
    const newAmt = Math.max(0, amt);
    const newTerms = newAmt > 0 ? 'Fixed' : (freightTerms === 'Fixed' ? 'Extra as Actual / To pay' : (freightTerms || 'Extra as Actual / To pay'));
    const clause = formatFreightTermClause(newTerms, newAmt, freightCustomNote);
    setFreightAmount(newAmt);
    setFreightTerms(newTerms);
    setTerms((t) => syncFreightToPiTerms(t, clause));
  };

  const handleFreightCustomNoteChange = (note: string) => {
    const clause = formatFreightTermClause(freightTerms || 'Custom', Number(freightAmount) || 0, note);
    setFreightCustomNote(note);
    setTerms((t) => syncFreightToPiTerms(t, clause));
  };

  const totalTaxable = basicPrice + Number(freightAmount || 0) + Number(installationCharge || 0);

  const selectedCompany = useMemo(
    () => companies.find((c) => c.id === companyProfileId) || companies[0],
    [companies, companyProfileId]
  );
  const sellerStateCode = (selectedCompany?.stateCode || (selectedCompany?.gstin ? selectedCompany.gstin.slice(0, 2) : '07')).trim();

  const gstBreakdown = calculateGstSplit(
    totalTaxable,
    billingAddress.stateCode,
    billingAddress.state,
    false,
    18,
    billingAddress.gstin,
    billingAddress.addressLine,
    sellerStateCode
  );
  const grandTotal = gstBreakdown.grandTotal;
  const requiredAdvance = Math.round(grandTotal * (Number(advancePercentage || 50) / 100));

  // Field validation
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    if (!billingAddress.partyName.trim()) {
      const fallbackParty = customers.find((c) => c.id === customerId)?.legalName || 'Valued Customer';
      setBillingAddress((b) => ({ ...b, partyName: fallbackParty }));
    }

    // Only validate GSTIN format if an actual commercial GSTIN is provided and not unregistered
    if (billingAddress.gstin && billingAddress.gstin.trim()) {
      const gstinVal = billingAddress.gstin.trim().toUpperCase();
      if (gstinVal !== 'URP' && gstinVal !== 'UNREGISTERED' && gstinVal.length !== 15 && gstinVal.length > 3) {
        errs.gstin = 'GSTIN should be 15 characters (e.g. 07AAAAA0000A1Z5) or URP if unregistered.';
      }
    }

    if (items.length === 0) {
      errs.items = 'At least one line item is required.';
    } else {
      items.forEach((it, idx) => {
        if (!it.description.trim() && !it.customModelName?.trim()) {
          const matchedModel = it.modelId ? catalogModels.find((m) => m.id === it.modelId) : null;
          it.description = matchedModel?.title ? `Pacific ${matchedModel.title}` : 'Pacific Restroom Cubicle System';
        } else if (!it.description.trim() && it.customModelName?.trim()) {
          it.description = it.customModelName.trim();
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

  // Submit Update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || submitting) return;

    if (!validateForm()) {
      alert('Please fill in all required fields and correct the errors marked in red.');
      return;
    }

    setSubmitting(true);
    try {
      // Build clean structured address lines without repetitive tokens or duplicate PIN
      const billToAddressFormatted = formatStructuredAddress(
        billingAddress.addressLine,
        billingAddress.city,
        billingAddress.pincode,
        billingAddress.state
      );

      const shipToAddressFormatted = formatStructuredAddress(
        deliveryAddress.addressLine,
        deliveryAddress.city,
        deliveryAddress.pincode,
        deliveryAddress.state
      );

      // Prepare clean terms without unwanted accessories blocks, negative installation, or redundant freight
      const finalTerms = terms.filter((t) => {
        if (!t) return false;
        const tLower = t.toLowerCase();
        if (t.startsWith('[PI_SCOPE:') || t.startsWith('[METADATA:')) return false;
        if (
          tLower.includes('hardware accessories') ||
          tLower.includes('standard inclusions') ||
          tLower.includes('gravity hinges') ||
          tLower.includes('hardware scope')
        ) {
          return false;
        }
        if (tLower.includes('installation') && (tLower.includes('not applicable') || tLower.includes('n/a'))) {
          return false;
        }
        if (
          tLower.includes('freight charges are extra as actual') ||
          (tLower.includes('freight') && tLower.includes('extra as actual')) ||
          (tLower.includes('freight') && tLower.includes('to pay'))
        ) {
          return false;
        }
        return true;
      });

      // Persist explicit scope tag
      finalTerms.push(`[PI_SCOPE:${piScope || 'CUBICLE'}]`);

      // Enrich item descriptions with specifications so they persist to DB, PDF, and Detail views
      const enrichedItems = items.map(enrichPiItemForSubmission);

      await piApi.update(id, {
        customerId,
        companyProfileId: companyProfileId || undefined,
        placeOfSupply,
        placeOfSupplyStateCode,
        reverseCharge,
        modeOfTransport,
        vehicleNumber,
        grLrNumber,
        linkedPoNumber,
        linkedPoDate: linkedPoDate || undefined,
        freightAmount,
        freightTerms: freightTerms || (Number(freightAmount || 0) > 0 ? 'Fixed' : 'Extra as Actual / To pay'),
        freightCustomNote: freightCustomNote || undefined,
        installationCharge: Number(installationCharge) || 0,
        installationRatePerCubicle: Number(installationCharge) > 0 ? (installationRatePerCubicle ?? 1000) : undefined,
        installationCubicleCount: Number(installationCharge) > 0 ? (installationCubicleCount || detectedCubicleCount || undefined) : undefined,
        installationOption: installationMode === 'OPTION' ? (installationOption || 'Included') : undefined,
        installationCustomNote: installationMode === 'OPTION' && installationOption === 'Custom' ? installationCustomNote : undefined,
        advancePercentage,
        advanceRequiredAmount: requiredAdvance,
        status,
        revisionReason: revisionReason.trim() || undefined,
        billTo: {
          partyName: billingAddress.partyName,
          gstin: billingAddress.gstin ? billingAddress.gstin.toUpperCase().trim() : undefined,
          pan: billingAddress.pan ? billingAddress.pan.toUpperCase().trim() : undefined,
          addressLine: billToAddressFormatted,
          state: billingAddress.state,
          stateCode: billingAddress.stateCode,
          phone: billingAddress.phone || undefined,
          email: billingAddress.email || undefined,
        },
        shipTo: {
          partyName: deliveryAddress.partyName || billingAddress.partyName,
          gstin: undefined,
          addressLine: shipToAddressFormatted || billToAddressFormatted,
          state: deliveryAddress.state || billingAddress.state,
          stateCode: deliveryAddress.stateCode || billingAddress.stateCode || undefined,
          phone: deliveryAddress.phone || billingAddress.phone || undefined,
        },
        items: enrichedItems,
        terms: finalTerms,
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

  const inputCls =
    'w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] transition-colors';
  const labelCls = 'block text-xs font-semibold text-gray-400 mb-1';
  const getInputCls = (key: string) =>
    fieldErrors[key]
      ? 'w-full bg-[#0a0a1a] border border-red-500 rounded-xl p-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-400 transition-colors'
      : inputCls;

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
          to="/admin/dashboard/proforma-invoices"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-semibold transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to List
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-24 max-w-6xl mx-auto">
      {/* ── Top Back Button ────────────────────────────────────── */}
      <div className="py-2">
        <Link
          to={`/admin/dashboard/proforma-invoices/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to PI Details
        </Link>
      </div>

      {/* ── Document Flow Timeline (Stage 02) ───────────────────── */}
      <DocumentFlowTimeline
        currentStage={2}
        advanceInfo={{
          grandTotal,
          advanceRequired: requiredAdvance,
          advancePaymentStatus: status === 'ISSUED' ? 'PENDING' : 'DRAFT',
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
              Saving edits automatically creates an immutable revision snapshot and archives its PDF. Previous revisions remain accessible in the Revision History.
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

      {/* ── Quick Scope & Boilerplate Presets ── */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#7FB706]" /> Active Scope Preset:
          </span>
          <span className="text-xs text-gray-400">Proforma Invoice supply category</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setPiScope('CUBICLE');
              if (!items.some((it) => it.itemType !== 'hardware' && it.systemCategory !== 'board')) {
                handleAddCubicleItem();
              }
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg min-h-[36px] transition cursor-pointer flex items-center gap-1.5 ${
              (!piScope || piScope === 'CUBICLE')
                ? 'bg-[#7FB706]/20 text-[#7FB706] border border-[#7FB706]/40'
                : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Standard Cubicle
          </button>
          <button
            type="button"
            onClick={() => {
              setPiScope('CUSTOM');
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg min-h-[36px] transition cursor-pointer flex items-center gap-1.5 ${
              piScope === 'CUSTOM'
                ? 'bg-[#7FB706]/20 text-[#7FB706] border border-[#7FB706]/40'
                : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" /> Custom (Board &amp; Hardware)
          </button>
          <button
            type="button"
            onClick={() => {
              setPiScope('BOARD');
              if (!items.some((it) => it.systemCategory === 'board')) {
                handleAddBoardItem();
              }
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg min-h-[36px] transition cursor-pointer flex items-center gap-1.5 ${
              piScope === 'BOARD'
                ? 'bg-[#7FB706]/20 text-[#7FB706] border border-[#7FB706]/40'
                : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white'
            }`}
          >
            <Package className="w-3.5 h-3.5" /> Board Only (HPL / HDF)
          </button>
          <button
            type="button"
            onClick={() => {
              setPiScope('HARDWARE');
              if (!items.some((it) => it.itemType === 'hardware')) {
                handleAddHardwareItem();
              }
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg min-h-[36px] transition cursor-pointer flex items-center gap-1.5 ${
              piScope === 'HARDWARE'
                ? 'bg-[#7FB706]/20 text-[#7FB706] border border-[#7FB706]/40'
                : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" /> Custom Hardware Only
          </button>
        </div>
      </div>

      {/* ── Dynamic Issuing Branch & Entity Selection ───────── */}
      <BranchSelector
        companies={companies}
        selectedCompanyId={companyProfileId}
        onSelectCompany={(compId) => setCompanyProfileId(compId)}
        label="Issuing Branch & Commercial Operating Entity"
        sublabel="Select which branch is issuing this Proforma Invoice. Determines seller GST jurisdiction, billing address, bank remittance coordinates, and factory dispatch."
      />

      {/* ── Client Selection ────────────────────────────────────── */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/5 pb-2">
          <Building2 className="w-4 h-4 text-[#7FB706]" /> Client Master Assignment
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CustomerSearchSelect
            customers={customers}
            selectedCustomerId={customerId}
            onSelectCustomer={(cId) => handleCustomerSelect(cId)}
            label="Customer Party"
            placeholder="Search party name, email, GST, phone..."
            required={false}
          />

          <div>
            <label className={labelCls}>Lifecycle Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={inputCls + ' font-semibold text-amber-300'}
            >
              <option value="DRAFT">DRAFT (Drafting &amp; Internal Review)</option>
              <option value="ISSUED">ISSUED (Official Commercial Demand)</option>
              <option value="PARTIALLY_PAID">PARTIALLY_PAID</option>
              <option value="PAID">PAID</option>
              <option value="CANCELLED">CANCELLED</option>
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
              Tax Target
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className={labelCls}>Legal / Entity Name *</label>
              <input
                type="text"
                value={billingAddress.partyName}
                onChange={(e) => {
                  setBillingAddress((prev) => ({ ...prev, partyName: e.target.value }));
                  if (fieldErrors.partyName) {
                    setFieldErrors((prev) => {
                      const { partyName, ...rest } = prev;
                      return rest;
                    });
                  }
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
                  value={billingAddress.gstin}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    const stateCode = val.length >= 2 && /^\d{2}$/.test(val.slice(0, 2)) ? val.slice(0, 2) : billingAddress.stateCode;
                    const state = (stateCode ? GST_STATE_CODE_MAP[stateCode] : undefined) || (stateCode === '07' ? 'Delhi' : billingAddress.state);
                    setPlaceOfSupply(state);
                    setPlaceOfSupplyStateCode(stateCode);
                    setBillingAddress((prev) => ({
                      ...prev,
                      gstin: val,
                      stateCode,
                      state,
                    }));
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
                  value={billingAddress.pan}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setBillingAddress((prev) => ({ ...prev, pan: val }));
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
                value={billingAddress.addressLine}
                onChange={(e) =>
                  setBillingAddress((prev) => ({ ...prev, addressLine: e.target.value }))
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
                  value={billingAddress.city}
                  onChange={(e) =>
                    setBillingAddress((prev) => ({ ...prev, city: e.target.value }))
                  }
                  placeholder="e.g. Gurugram, Noida, Mumbai"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Pincode</label>
                <input
                  type="text"
                  maxLength={6}
                  value={billingAddress.pincode}
                  onChange={(e) =>
                    setBillingAddress((prev) => ({ ...prev, pincode: e.target.value }))
                  }
                  placeholder="110020"
                  className={inputCls + ' font-mono'}
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className={labelCls}>State</label>
                  {billingAddress.stateCode && (
                    <span className="text-[10px] font-mono text-gray-400">
                      Code: {billingAddress.stateCode}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={billingAddress.state}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBillingAddress((prev) => ({ ...prev, state: val }));
                  }}
                  placeholder="e.g. Delhi, Haryana, Maharashtra"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Billing Phone</label>
                <input
                  type="text"
                  value={billingAddress.phone}
                  onChange={(e) =>
                    setBillingAddress((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="+91 98765 43210"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Billing Email</label>
                <input
                  type="email"
                  value={billingAddress.email}
                  onChange={(e) =>
                    setBillingAddress((prev) => ({ ...prev, email: e.target.value }))
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-2.5 gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-cyan-400" /> Delivery Address (Ship To / Site)
              </h3>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md border ${
                  isCustomDelivery
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                    : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'
                }`}
              >
                {isCustomDelivery ? (
                  <>
                    <Edit3 className="w-3 h-3 text-amber-400" />
                    Custom Site Entry
                  </>
                ) : (
                  <>
                    <Package className="w-3 h-3 text-cyan-400" />
                    Fetched from Customer Data
                  </>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearDeliveryAddress}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 transition cursor-pointer"
                title="Write Custom Entire Site Details"
              >
                <Edit3 className="w-3 h-3" /> Write Custom Site Address
              </button>
              <button
                type="button"
                onClick={handleCopyBillingToDelivery}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 transition cursor-pointer"
                title="Copy from Billing Address"
              >
                <Copy className="w-3 h-3" /> Same as Billing
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {(() => {
              const selectedCustomer = customers.find((c) => c.id === customerId);
              if (selectedCustomer?.addresses && selectedCustomer.addresses.length > 1) {
                return (
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-400">Choose Saved Site:</span>
                    <select
                      aria-label="Choose Saved Site"
                      onChange={(e) => {
                        const idx = Number(e.target.value);
                        if (!isNaN(idx) && selectedCustomer.addresses?.[idx]) {
                          const addr = selectedCustomer.addresses[idx];
                          let sState = addr.state || '';
                          let sCode = addr.stateCode || '';
                          if (!sCode && sState) {
                            const match = Object.entries(GST_STATE_CODE_MAP).find(([, name]) => name.toLowerCase() === sState.toLowerCase());
                            if (match) sCode = match[0];
                          }
                          setDeliveryAddress({
                            partyName: selectedCustomer.legalName || selectedCustomer.tradeName || deliveryAddress.partyName,
                            addressLine: [addr.addressLine1, addr.addressLine2].filter(Boolean).join(', '),
                            city: addr.city || '',
                            pincode: addr.postalCode || (addr as any)?.pincode || '',
                            state: sState,
                            stateCode: sCode,
                            phone: selectedCustomer.phone || (selectedCustomer as any).contactPhone || deliveryAddress.phone,
                          });
                          setIsCustomDelivery(false);
                        }
                      }}
                      className="bg-[#0a0a1a] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-400"
                    >
                      <option value="">-- Alternate Saved Addresses ({selectedCustomer.addresses.length}) --</option>
                      {selectedCustomer.addresses.map((a: any, i: number) => (
                        <option key={a.id || i} value={i}>
                          {a.addressType || `Site ${i + 1}`}: {a.addressLine1 ? `${a.addressLine1.slice(0, 35)}...` : a.city || 'Address'}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }
              return null;
            })()}

            <div>
              <label className={labelCls}>Consignee / Site Name</label>
              <input
                type="text"
                value={deliveryAddress.partyName}
                onChange={(e) => {
                  setDeliveryAddress((prev) => ({ ...prev, partyName: e.target.value }));
                  setIsCustomDelivery(true);
                }}
                placeholder="Site contact or company name"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Delivery / Site Address</label>
              <input
                type="text"
                value={deliveryAddress.addressLine}
                onChange={(e) => {
                  setDeliveryAddress((prev) => ({ ...prev, addressLine: e.target.value }));
                  setIsCustomDelivery(true);
                }}
                placeholder="Exact site delivery location, plot no, building"
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>City</label>
                <input
                  type="text"
                  value={deliveryAddress.city}
                  onChange={(e) => {
                    setDeliveryAddress((prev) => ({ ...prev, city: e.target.value }));
                    setIsCustomDelivery(true);
                  }}
                  placeholder="e.g. Gurugram, Noida, Mumbai"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>PIN / Postal Code</label>
                <input
                  type="text"
                  maxLength={6}
                  value={deliveryAddress.pincode}
                  onChange={(e) => {
                    setDeliveryAddress((prev) => ({
                      ...prev,
                      pincode: e.target.value.replace(/[^0-9]/g, ''),
                    }));
                    setIsCustomDelivery(true);
                  }}
                  placeholder="e.g. 122002"
                  className={inputCls + ' font-mono'}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={labelCls}>State / UT</label>
                  {deliveryAddress.stateCode && (
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                      Code: {deliveryAddress.stateCode}
                    </span>
                  )}
                </div>
                <select
                  value={
                    deliveryAddress.stateCode ||
                    Object.entries(GST_STATE_CODE_MAP).find(
                      ([, name]) => name.toLowerCase() === (deliveryAddress.state || '').toLowerCase()
                    )?.[0] ||
                    ''
                  }
                  onChange={(e) => {
                    const code = e.target.value;
                    const sName = GST_STATE_CODE_MAP[code] || '';
                    setDeliveryAddress((prev) => ({
                      ...prev,
                      state: sName,
                      stateCode: code,
                    }));
                    setIsCustomDelivery(true);
                  }}
                  className={inputCls}
                >
                  <option value="">-- Select Destination State --</option>
                  {Object.entries(GST_STATE_CODE_MAP).map(([code, name]) => (
                    <option key={code} value={code}>
                      {name} ({code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls}>Site Contact Phone</label>
              <input
                type="text"
                value={deliveryAddress.phone}
                onChange={(e) => {
                  setDeliveryAddress((prev) => ({ ...prev, phone: e.target.value }));
                  setIsCustomDelivery(true);
                }}
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
              value={placeOfSupply}
              onChange={(e) => setPlaceOfSupply(e.target.value)}
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
              value={placeOfSupplyStateCode}
              onChange={(e) => setPlaceOfSupplyStateCode(e.target.value)}
              placeholder="07"
              className={inputCls + ' font-mono'}
              required
            />
          </div>

          <div>
            <label className={labelCls}>Mode of Transport</label>
            <select
              value={modeOfTransport}
              onChange={(e) => setModeOfTransport(e.target.value)}
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
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              placeholder="e.g. DL 01 AB 1234"
              className={inputCls + ' font-mono'}
            />
          </div>

          <div>
            <label className={labelCls}>GR / LR Number</label>
            <input
              type="text"
              value={grLrNumber}
              onChange={(e) => setGrLrNumber(e.target.value)}
              placeholder="e.g. LR-987654"
              className={inputCls + ' font-mono'}
            />
          </div>

          <div>
            <label className={labelCls}>Linked PO Number</label>
            <input
              type="text"
              value={linkedPoNumber}
              onChange={(e) => setLinkedPoNumber(e.target.value)}
              placeholder="e.g. PO/2026/049"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Linked PO Date</label>
            <input
              type="date"
              value={linkedPoDate}
              onChange={(e) => setLinkedPoDate(e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className={labelCls}>Freight Amount (₹)</label>
              <div className="flex gap-1 text-[10px] pb-1">
                <button
                  type="button"
                  onClick={() => handleFreightOptionChange('Included')}
                  className={`px-1.5 py-0.5 rounded ${freightTerms === 'Included' ? 'bg-emerald-500 text-black font-bold' : 'bg-white/5 text-gray-400 hover:text-white'}`}
                >
                  Included
                </button>
                <button
                  type="button"
                  onClick={() => handleFreightOptionChange('Extra as Actual / To pay')}
                  className={`px-1.5 py-0.5 rounded ${freightTerms === 'Extra as Actual / To pay' ? 'bg-amber-500 text-black font-bold' : 'bg-white/5 text-gray-400 hover:text-white'}`}
                >
                  Extra
                </button>
                <button
                  type="button"
                  onClick={() => handleFreightOptionChange('Client Scope')}
                  className={`px-1.5 py-0.5 rounded ${freightTerms === 'Client Scope' ? 'bg-sky-500 text-black font-bold' : 'bg-white/5 text-gray-400 hover:text-white'}`}
                >
                  Client
                </button>
              </div>
            </div>
            <input
              type="number"
              min="0"
              step="0.01"
              value={freightAmount}
              onChange={(e) => handleFreightAmountChange(Number(e.target.value) || 0)}
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
                value={advancePercentage}
                onChange={(e) => setAdvancePercentage(Number(e.target.value) || 0)}
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
              id="reverseChargeEdit"
              checked={reverseCharge}
              onChange={(e) => setReverseCharge(e.target.checked)}
              className="w-4 h-4 rounded border-gray-700 text-[#7FB706] focus:ring-[#7FB706]"
            />
            <label htmlFor="reverseChargeEdit" className="text-xs text-gray-300">
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
              <Layers className="w-4 h-4 text-[#7FB706]" /> Line Items
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Select cubicle models to auto-generate hardware lists, or configure raw board supply or custom hardware fittings.
            </p>
            {fieldErrors.items && (
              <p className="text-xs text-red-400 mt-0.5">{fieldErrors.items}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleAddCustomItem}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-sm"
              title="Add custom item, bespoke model, or service"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> + Custom Item
            </button>
            <button
              type="button"
              onClick={handleAddBoardItem}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-lg text-xs font-bold cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> + Board Sheet
            </button>
            <button
              type="button"
              onClick={handleAddHardwareItem}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg text-xs font-bold cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> + Hardware Item
            </button>
            <button
              type="button"
              onClick={handleAddCubicleItem}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#7FB706]/10 hover:bg-[#7FB706]/20 text-[#7FB706] rounded-lg text-xs font-bold cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> + Cubicle Model
            </button>
          </div>
        </div>

        {/* 4-Way Mode / Scope Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 bg-[#0a0a1a] rounded-xl border border-white/10">
          <button
            type="button"
            onClick={() => {
              setPiScope('CUBICLE');
              if (!items.some((it) => it.itemType !== 'hardware' && it.systemCategory !== 'board')) {
                handleAddCubicleItem();
              }
            }}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              (!piScope || piScope === 'CUBICLE')
                ? 'bg-[#7FB706] text-black shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" /> Restroom Cubicle System
          </button>
          <button
            type="button"
            onClick={() => {
              setPiScope('CUSTOM');
            }}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              piScope === 'CUSTOM'
                ? 'bg-[#7FB706] text-black shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Boxes className="w-4 h-4 shrink-0" /> Custom (Board &amp; Hardware)
          </button>
          <button
            type="button"
            onClick={() => {
              setPiScope('BOARD');
              if (!items.some((it) => it.systemCategory === 'board')) {
                handleAddBoardItem();
              }
            }}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              piScope === 'BOARD'
                ? 'bg-[#7FB706] text-black shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Package className="w-4 h-4 shrink-0" /> Board Only (HPL / HDF)
          </button>
          <button
            type="button"
            onClick={() => {
              setPiScope('HARDWARE');
              if (!items.some((it) => it.itemType === 'hardware')) {
                handleAddHardwareItem();
              }
            }}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              piScope === 'HARDWARE'
                ? 'bg-[#7FB706] text-black shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Wrench className="w-4 h-4 shrink-0" /> Custom Hardware Only
          </button>
        </div>

        {items.length === 0 && (
          <div className="text-center py-6 text-gray-500 text-sm">
            No line items configured. Click &quot;Add Item&quot; to configure proforma invoice items.
          </div>
        )}

        <div className="space-y-5">
          {piScope === 'CUSTOM' ? (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-indigo-300">
                <span className="flex items-center gap-2 font-medium">
                  <Sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  <span><strong>Customized Items &amp; Supply Mode Active:</strong> Configure custom items, bespoke models, vanity counters, glass partitions, board sheets, and hardware accessories freely without requiring a standard cubicle model.</span>
                </span>
                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={handleAddCustomItem}
                    className="px-2.5 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> + Custom Item
                  </button>
                  <button
                    type="button"
                    onClick={handleAddBoardItem}
                    className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Board Sheet
                  </button>
                  <button
                    type="button"
                    onClick={handleAddHardwareItem}
                    className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Hardware Item
                  </button>
                </div>
              </div>

              {items.map((item, idx) => {
                const lineTotal = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
                const isCustom = item.itemType === 'custom' || item.systemCategory === 'custom' || item.isCustom;
                const isHw = !isCustom && (item.itemType === 'hardware' || item.systemCategory === 'hardware');

                if (isCustom) {
                  return (
                    <CustomPiItemCard
                      key={idx}
                      index={idx}
                      item={item}
                      fieldErrors={fieldErrors}
                      onChange={(f, val) => handleItemChange(idx, f, val)}
                      onRemove={() => handleRemoveItem(idx)}
                      canRemove={items.length > 1}
                    />
                  );
                }

                if (isHw) {
                  return (
                    <div key={idx} className="bg-[#0a0a1a] border border-cyan-500/30 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-cyan-400">Item #{idx + 1}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                            <Wrench className="w-3 h-3 text-cyan-400" /> Hardware Fitting
                          </span>
                        </div>
                        {items.length > 1 && (
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
                        <div className="sm:col-span-4 space-y-1">
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

                        <div className="sm:col-span-2 space-y-1">
                          <label className={labelCls}>HSN / SAC</label>
                          <HsnSelectInput
                            value={item.hsnSac || ''}
                            onChange={(val) => handleItemChange(idx, 'hsnSac', val)}
                            options={['3925', '8302', '7610']}
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
                }

                // Render Board Item
                return (
                  <div key={idx} className="bg-[#0a0a1a] border border-amber-500/30 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-amber-400">Item #{idx + 1}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <Package className="w-3 h-3 text-amber-400" /> Board Sheet Supply
                        </span>
                      </div>
                      {items.length > 1 && (
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
                        <label className={labelCls}>Color / Shade / Texture</label>
                        <input
                          type="text"
                          value={item.boardColor || ''}
                          onChange={(e) => handleItemChange(idx, 'boardColor', e.target.value)}
                          placeholder="e.g. As approved / Shade code (Optional)"
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
                      </div>

                      <div className="sm:col-span-2 space-y-1">
                        <label className={labelCls}>HSN / SAC</label>
                        <HsnSelectInput
                          value={item.hsnSac || '4823'}
                          onChange={(val) => handleItemChange(idx, 'hsnSac', val)}
                          options={['4823', '4411', '48239019', '44119229']}
                        />
                      </div>

                      <div className="sm:col-span-2 space-y-1">
                        <label className={labelCls}>Unit</label>
                        <select
                          value={item.unit || 'SQFT'}
                          onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                          className={inputCls}
                        >
                          {['SQFT', 'SHEET', 'SQM', 'NOS', 'PCS'].map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-2 space-y-1">
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

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleAddCustomItem}
                  className="flex-1 min-w-[160px] py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-dashed border-indigo-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-indigo-400" /> Add Custom Item
                </button>
                <button
                  type="button"
                  onClick={handleAddBoardItem}
                  className="flex-1 min-w-[160px] py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-dashed border-amber-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Board Sheet
                </button>
                <button
                  type="button"
                  onClick={handleAddHardwareItem}
                  className="flex-1 min-w-[160px] py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-dashed border-cyan-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Hardware Item
                </button>
              </div>
            </div>
          ) : piScope === 'BOARD' ? (
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

              {items.map((item, idx) => {
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
                      {items.length > 1 && (
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
                          placeholder="e.g. As approved / Shade code (Optional)"
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
                        <HsnSelectInput
                          value={item.hsnSac || '4823'}
                          onChange={(val) => handleItemChange(idx, 'hsnSac', val)}
                          options={['4823', '4411']}
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
          ) : piScope === 'HARDWARE' ? (
            <div className="space-y-4">
              {items.length === 0 && (
                <div className="text-center py-6 border border-dashed border-cyan-500/30 rounded-xl bg-cyan-500/5">
                  <p className="text-xs text-gray-400 mb-2">No hardware items configured yet.</p>
                  <button
                    type="button"
                    onClick={handleAddHardwareItem}
                    className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Hardware Item
                  </button>
                </div>
              )}

              {items.map((item, idx) => {
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
                      {items.length > 1 && (
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
                      <div className="sm:col-span-4 space-y-1">
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

                      <div className="sm:col-span-2 space-y-1">
                        <label className={labelCls}>HSN / SAC</label>
                        <HsnSelectInput
                          value={item.hsnSac || ''}
                          onChange={(val) => handleItemChange(idx, 'hsnSac', val)}
                          options={['3925', '8302', '7610']}
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
                <Plus className="w-4 h-4" /> Add Hardware Item
              </button>
            </div>
          ) : (
            (() => {
              const customItems = items.filter(
                (it) => it.itemType === 'custom' || it.systemCategory === 'custom' || it.isCustom
              );

              const primaryCubicleItem = items.find(
                (it) => it.itemType !== 'hardware' && it.itemType !== 'custom' && it.systemCategory !== 'custom' && !it.isCustom && it.systemCategory !== 'ump' && it.systemCategory !== 'locker' && it.systemCategory !== 'board'
              );
              const primaryCubicleIdx = primaryCubicleItem ? items.indexOf(primaryCubicleItem) : -1;

              const umpItem = items.find(
                (it) => it.systemCategory === 'ump' || (it.itemType !== 'hardware' && it.itemType !== 'custom' && !it.isCustom && (it.description.toLowerCase().includes('urinal') || it.description.toLowerCase().includes('ump')))
              );

              const lockerItem = items.find(
                (it) => it.systemCategory === 'locker' || (it.itemType !== 'hardware' && it.itemType !== 'custom' && !it.isCustom && it.description.toLowerCase().includes('locker'))
              );

              const additionalCubicleItems = items.filter(
                (it, i) => it.itemType !== 'hardware' && it.itemType !== 'custom' && it.systemCategory !== 'custom' && !it.isCustom && it.systemCategory !== 'board' && i !== primaryCubicleIdx && it !== umpItem && it !== lockerItem
              );

              const hardwareItems = items.filter((it) => it.itemType === 'hardware');
              const boardItems = items.filter((it) => it.systemCategory === 'board');

              return (
                <>
                  {boardItems.length > 0 && (
                    <div className="bg-[#121226] border border-amber-500/30 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                        <div className="flex items-center gap-2">
                          <Boxes className="w-4 h-4 text-amber-400" />
                          <span className="text-xs font-bold text-white uppercase tracking-wider">
                            Board / Sheet Items ({boardItems.length})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddBoardItem}
                          className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> + Add Board
                        </button>
                      </div>

                      {boardItems.map((bItem) => {
                        const bIdx = items.indexOf(bItem);
                        const bTotal = (Number(bItem.quantity) || 0) * (Number(bItem.rate) || 0);
                        return (
                          <div key={bIdx} className="bg-white/[0.02] border border-white/10 rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-300 font-semibold">{bItem.description || `Board Item #${bIdx + 1}`}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(bIdx)}
                                className="text-red-400 hover:text-red-300 text-xs p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-7 gap-2 text-xs">
                              <input
                                type="text"
                                value={bItem.description}
                                onChange={(e) => handleItemChange(bIdx, 'description', e.target.value)}
                                placeholder="Board description"
                                className="sm:col-span-2 bg-[#121226] border border-white/10 rounded px-2.5 py-1.5 text-white"
                              />
                              <input
                                type="text"
                                value={bItem.hsnSac || '4823'}
                                onChange={(e) => handleItemChange(bIdx, 'hsnSac', e.target.value)}
                                placeholder="HSN (4823)"
                                className="bg-[#121226] border border-white/10 rounded px-2.5 py-1.5 text-white font-mono"
                                title="HSN / SAC Code"
                              />
                              <input
                                type="text"
                                value={bItem.boardThickness || ''}
                                onChange={(e) => handleItemChange(bIdx, 'boardThickness', e.target.value)}
                                placeholder="Thickness (12mm)"
                                className="bg-[#121226] border border-white/10 rounded px-2.5 py-1.5 text-white"
                              />
                              <input
                                type="text"
                                value={bItem.cubicleSize || ''}
                                onChange={(e) => handleItemChange(bIdx, 'cubicleSize', e.target.value)}
                                placeholder="Sheet Size (4x8ft)"
                                className="bg-[#121226] border border-white/10 rounded px-2.5 py-1.5 text-white"
                              />
                              <input
                                type="number"
                                value={bItem.quantity}
                                onChange={(e) => handleItemChange(bIdx, 'quantity', Number(e.target.value) || 0)}
                                placeholder="Qty"
                                className="bg-[#121226] border border-white/10 rounded px-2.5 py-1.5 text-white font-mono"
                              />
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={bItem.rate}
                                  onChange={(e) => handleItemChange(bIdx, 'rate', Number(e.target.value) || 0)}
                                  placeholder="Rate (₹)"
                                  className="w-full bg-[#121226] border border-white/10 rounded px-2.5 py-1.5 text-white font-mono"
                                />
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono">
                              <span>HSN: <span className="text-[#7FB706] font-bold">{bItem.hsnSac || '4823'}</span></span>
                              <span>Subtotal: <span className="font-bold text-white">₹ {bTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* ── OPTIONAL CUBICLE SYSTEM (PRIMARY) ── */}
                  {!primaryCubicleItem && (
                    <div className="bg-[#0a0a1a] border border-dashed border-[#7FB706]/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-[#7FB706]" />
                          Primary Cubicle System (Optional — Currently Omitted)
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          This Proforma Invoice can consist purely of Custom Items or Custom Models. Click below if you need a standard cubicle system.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddPrimaryCubicleItem}
                        className="px-3 py-1.5 bg-[#7FB706]/20 hover:bg-[#7FB706]/30 text-[#7FB706] border border-[#7FB706]/40 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> + Add Primary Cubicle System
                      </button>
                    </div>
                  )}

                  {/* ── SECTION 1: CUBICLE MODEL SYSTEM (PRIMARY) ── */}
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
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(primaryCubicleIdx)}
                              className="px-2 py-0.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded flex items-center gap-1 transition-colors cursor-pointer"
                              title="Remove Primary Cubicle System (Item is Optional)"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Remove
                            </button>
                          )}
                        </div>
                      </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="sm:col-span-4 space-y-1.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <label className={labelCls}>Cubicle Model Selection &amp; Description (Optional)</label>
                          <span className="text-[11px] text-[#7FB706] font-medium flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Auto-generates hinges, locks, hooks, legs &amp; channels
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <select
                            value={primaryCubicleItem.modelId || ''}
                            onChange={(e) => handleSelectModel(primaryCubicleIdx, e.target.value)}
                            className="w-full bg-[#161536] border border-[#7FB706]/40 rounded-xl px-3 py-2.5 text-white font-semibold text-xs focus:border-[#7FB706] focus:outline-none"
                          >
                            <option value="">-- Choose Cubicle Model (Optional) --</option>
                            <option value="custom">-- Custom / Manual Specification (No Model) --</option>
                            {cubicleModels.length > 0 && (
                              <optgroup label={`Standard Restroom Cubicles (${cubicleModels.length} Listed)`}>
                                {cubicleModels.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.title}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            {kidsModels.length > 0 && (
                              <optgroup label={`Kids Cubicle Models (${kidsModels.length} Listed)`}>
                                {kidsModels.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.title}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            {primaryCubicleItem.modelId && !catalogModels.some((m) => m.id === primaryCubicleItem.modelId) && (
                              <option value={primaryCubicleItem.modelId}>{primaryCubicleItem.description || primaryCubicleItem.modelId}</option>
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
                        <label className={labelCls}>HSN / SAC</label>
                        <HsnSelectInput
                          value={primaryCubicleItem.hsnSac || '48239019'}
                          onChange={(val) => handleItemChange(primaryCubicleIdx, 'hsnSac', val)}
                          options={['48239019', '44119229']}
                        />
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
                            placeholder="e.g. As approved / Shade code (Optional)"
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

                {/* ── SECTION 2: URINAL MODESTY PARTITION (OPTIONAL) ── */}
                <div className={`rounded-xl p-4 space-y-3 transition-all ${
                  umpItem ? 'bg-[#0a1826] border border-cyan-500/50 shadow-lg shadow-cyan-950/20' : 'bg-[#0a1826]/40 border border-cyan-500/20'
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
                        <Sparkles className="w-3 h-3" /> Auto-generates Wall Cantilever Clamps &amp; Channels
                      </span>
                    </div>
                    <select
                      value={umpItem?.modelId || ''}
                      onChange={(e) => handleSelectUmpModel(e.target.value)}
                      className="w-full bg-[#161536] border border-cyan-500/40 rounded-xl px-3 py-2.5 text-white font-semibold text-xs focus:border-cyan-400 focus:outline-none"
                    >
                      <option value="">-- No Urinal Partitions Required (Optional) --</option>
                      {urinalModels.length > 0 ? (
                        <optgroup label={`Urinal Partitions (${urinalModels.length} Listed)`}>
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
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div>
                          <label className={labelCls}>HSN / SAC</label>
                          <HsnSelectInput
                            value={umpItem.hsnSac || '9403'}
                            onChange={(val) => handleUmpFieldChange('hsnSac', val)}
                            options={['9403', '48239019', '44119229', '8302']}
                            placeholder="Enter custom HSN / SAC"
                          />
                        </div>

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
                            <span>⚙️</span> Urinal Partition Specifications
                          </span>
                          <span className="text-[11px] text-cyan-400">Wall-mounted modesty divider details</span>
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
                              placeholder="e.g. As approved / Shade code (Optional)"
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
                          HSN: {umpItem.hsnSac || '9403'} · Urinal Modesty Partition System (Auto-generates individual hardware below)
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
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
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

                        <div>
                          <label className={labelCls}>HSN / SAC</label>
                          <HsnSelectInput
                            value={lockerItem.hsnSac || '9403'}
                            onChange={(val) => handleLockerFieldChange('hsnSac', val)}
                            options={['9403', '48239019', '44119229', '8302']}
                            placeholder="e.g. 9403"
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
                              placeholder="e.g. As approved / Shade code (Optional)"
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
                              placeholder="e.g. Master-Keyed Cam Lock, Concealed Pivot Hinges, Number Plates &amp; Plinth Legs"
                              className={inputCls}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-[11px] text-gray-400 italic">
                          HSN: {lockerItem.hsnSac || '9403'} · Modular Locker System (Auto-generates individual hardware below)
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
                  const realIdx = items.indexOf(item);
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

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="sm:col-span-4 space-y-1.5">
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
                                value={item.customModelName ?? (item.modelId && item.modelId !== 'CUSTOM' ? (catalogModels.find((m) => m.id === item.modelId)?.title || '') : '')}
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
                          <label className={labelCls}>HSN / SAC</label>
                          <HsnSelectInput
                            value={item.hsnSac || '48239019'}
                            onChange={(val) => handleItemChange(realIdx, 'hsnSac', val)}
                            options={['48239019', '44119229']}
                          />
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
                              placeholder="e.g. As approved / Shade code (Optional)"
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

                {/* ── SECTION 4.5: CUSTOM ITEMS / SPECIFICATIONS (IF ANY IN CUBICLE SCOPE) ── */}
                {customItems.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-indigo-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-400" />
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                          Custom Items &amp; Bespoke Works ({customItems.length} items)
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddCustomItem}
                        className="px-2.5 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 rounded text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> + Add Custom Item
                      </button>
                    </div>

                    <div className="space-y-3">
                      {customItems.map((item) => {
                        const realIdx = items.indexOf(item);
                        return (
                          <CustomPiItemCard
                            key={realIdx}
                            index={realIdx}
                            item={item}
                            fieldErrors={fieldErrors}
                            onChange={(field, val) => handleItemChange(realIdx, field, val)}
                            onRemove={() => handleRemoveItem(realIdx)}
                            canRemove={true}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

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
                        const realIdx = items.indexOf(item);
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
                                <HsnSelectInput
                                  value={item.hsnSac || '8302'}
                                  onChange={(val) => handleItemChange(realIdx, 'hsnSac', val)}
                                  options={['3925', '8302', '7610']}
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

                {/* Bottom Quick-Action Bar */}
                <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={handleAddCustomItem}
                    className="flex-1 min-w-[140px] py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-dashed border-indigo-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-indigo-400" /> + Add Custom Item
                  </button>
                  <button
                    type="button"
                    onClick={handleAddCubicleItem}
                    className="flex-1 min-w-[140px] py-2.5 bg-[#7FB706]/10 hover:bg-[#7FB706]/20 text-[#7FB706] border border-dashed border-[#7FB706]/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> + Add Cubicle Model
                  </button>
                  <button
                    type="button"
                    onClick={handleAddHardwareItem}
                    className="flex-1 min-w-[140px] py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-dashed border-cyan-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> + Add Hardware Item
                  </button>
                  <button
                    type="button"
                    onClick={handleAddBoardItem}
                    className="flex-1 min-w-[140px] py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-dashed border-amber-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> + Add Board Sheet
                  </button>
                </div>
              </>
            );
          })()
        )}
      </div>
      </div>

      {/* ── Card 6: Commercial Terms & Conditions ──────────────── */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Commercial Terms &amp; Conditions</h3>
          </div>
          <span className="text-xs text-gray-500 font-mono">{terms.length} Clauses</span>
        </div>

        <div className="space-y-2">
          {terms.map((term, idx) => (
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
        <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <span>🔧 Installation Charges (Per Cubicle Calculation)</span>
              </label>
              {installationMode === 'OPTION' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  {installationOption || 'Included'}
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
                    installationMode === 'RATE' && installationRatePerCubicle === p.rate
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
                    installationMode === 'OPTION' && installationOption === opt.id
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
                    value={installationRatePerCubicle ?? 1000}
                    onChange={(e) => {
                      const rate = Number(e.target.value) || 0;
                      const count = installationCubicleCount !== undefined && installationCubicleCount > 0 ? installationCubicleCount : detectedCubicleCount;
                      const tot = rate * count;
                      setInstallationRatePerCubicle(rate);
                      setInstallationCharge(tot);
                      if (rate > 0) {
                        const clause = formatInstallationTermClause('RATE', undefined, rate, count, undefined, tot);
                        setTerms((prev) => syncInstallationToPiTerms(prev, clause));
                      }
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
                    value={installationCubicleCount !== undefined && installationCubicleCount > 0 ? installationCubicleCount : (detectedCubicleCount || '')}
                    onChange={(e) => {
                      const count = Number(e.target.value) || 0;
                      const rate = installationRatePerCubicle ?? 1000;
                      const tot = rate * count;
                      setInstallationCubicleCount(count);
                      setInstallationCharge(tot);
                      if (rate > 0) {
                        const clause = formatInstallationTermClause('RATE', undefined, rate, count, undefined, tot);
                        setTerms((prev) => syncInstallationToPiTerms(prev, clause));
                      }
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
                    value={installationCharge || 0}
                    onChange={(e) => {
                      const total = Number(e.target.value) || 0;
                      const count = installationCubicleCount !== undefined && installationCubicleCount > 0 ? installationCubicleCount : detectedCubicleCount;
                      const derivedRate = count > 0 ? Math.round(total / count) : 0;
                      setInstallationCharge(total);
                      setInstallationRatePerCubicle(derivedRate);
                      if (total > 0) {
                        const clause = formatInstallationTermClause('RATE', undefined, derivedRate, count, undefined, total);
                        setTerms((prev) => syncInstallationToPiTerms(prev, clause));
                      }
                    }}
                    className={inputCls}
                  />
                </div>
              </div>

              {(!installationRatePerCubicle || installationRatePerCubicle === 0) && (
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
                    value={installationOption || 'Included'}
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
                    {INSTALLATION_OPTIONS.find((o) => o.id === installationOption)?.description ||
                      'Installation term mentioned on PI'}
                  </span>
                </div>

                <div>
                  <label className={labelCls}>Cubicles (Qty Reference)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={installationCubicleCount !== undefined && installationCubicleCount > 0 ? installationCubicleCount : (detectedCubicleCount || '')}
                    onChange={(e) => {
                      const count = Number(e.target.value) || 0;
                      setInstallationCubicleCount(count);
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
                    ₹ 0.00 <span className="ml-2 text-xs text-slate-400 font-normal">({installationOption || 'Included'})</span>
                  </div>
                  <span className="text-[10px] text-slate-400">No extra charge added to total proforma invoice price</span>
                </div>
              </div>

              {installationOption === 'Custom' && (
                <div>
                  <label className={labelCls}>Custom Installation Term / Scope *</label>
                  <input
                    type="text"
                    value={installationCustomNote || ''}
                    onChange={(e) => {
                      const note = e.target.value;
                      setInstallationCustomNote(note);
                      const clause = formatInstallationTermClause('OPTION', 'Custom', undefined, undefined, note, 0);
                      setTerms((prev) => syncInstallationToPiTerms(prev, clause));
                    }}
                    placeholder="e.g. Extra to Pay @ actuals at site (transport & lodging extra)"
                    className={inputCls}
                  />
                  <span className="text-[10px] text-slate-400">This custom text will appear on the proforma invoice document</span>
                </div>
              )}
            </div>
          )}

          {/* Document Mention Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs px-3.5 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
            <span className="flex items-center gap-1.5 flex-wrap">
              <span>📄 <strong>Mentioned on PI Document:</strong></span>
              <span className="font-medium text-white">
                {getInstallationMentionText(
                  installationMode,
                  installationOption,
                  installationRatePerCubicle,
                  effectiveCubicleCount,
                  installationCustomNote,
                  installationCharge
                )}
              </span>
            </span>
            <div className="flex items-center gap-3 shrink-0">
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

        {/* Freight Block */}
        <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-400" />
              <label className="text-xs font-bold text-white uppercase tracking-wider">
                Freight Terms &amp; Scope
              </label>
            </div>
            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => handleFreightOptionChange('Included')}
                className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                  freightTerms === 'Included'
                    ? 'bg-emerald-500 text-black font-bold shadow'
                    : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30'
                }`}
              >
                Included in Price
              </button>
              <button
                type="button"
                onClick={() => handleFreightOptionChange('Extra as Actual / To pay')}
                className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                  freightTerms === 'Extra as Actual / To pay'
                    ? 'bg-amber-500 text-black font-bold shadow'
                    : 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30'
                }`}
              >
                Extra as Actual
              </button>
              <button
                type="button"
                onClick={() => handleFreightOptionChange('Client Scope')}
                className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                  freightTerms === 'Client Scope'
                    ? 'bg-sky-500 text-black font-bold shadow'
                    : 'bg-sky-500/15 text-sky-300 hover:bg-sky-500/25 border border-sky-500/30'
                }`}
              >
                Client Scope
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Freight Term Preset *</label>
              <select
                value={freightTerms || 'Extra as Actual / To pay'}
                onChange={(e) => handleFreightOptionChange(e.target.value)}
                className={inputCls}
              >
                {FREIGHT_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id} className="bg-[#0a0a1a]">
                    {opt.label}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-400">
                {FREIGHT_OPTIONS.find((o) => o.id === freightTerms)?.description || 'Commercial freight term on invoice'}
              </span>
            </div>

            <div>
              <label className={labelCls}>
                Freight Amount (₹) {freightTerms === 'Fixed' && <span className="text-amber-400">*</span>}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={freightAmount}
                onChange={(e) => handleFreightAmountChange(Number(e.target.value) || 0)}
                placeholder="0.00"
                className={inputCls + ' font-mono'}
              />
              <span className="text-[10px] text-slate-400">
                {Number(freightAmount || 0) > 0
                  ? 'Fixed freight added to taxable proforma total'
                  : '₹0.00 — Freight not billed in total'}
              </span>
            </div>

            <div>
              <label className={labelCls}>Advance Required (%)</label>
              <select
                value={advancePercentage}
                onChange={(e) => setAdvancePercentage(Number(e.target.value) || 50)}
                className={inputCls}
              >
                {[10, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100].map((pct) => (
                  <option key={pct} value={pct}>{pct}% Advance Required</option>
                ))}
              </select>
              <span className="text-[10px] text-slate-400">
                Advance required prior to production dispatch
              </span>
            </div>
          </div>

          {freightTerms === 'Custom' && (
            <div>
              <label className={labelCls}>Custom Freight Terms Note</label>
              <input
                type="text"
                value={freightCustomNote || ''}
                onChange={(e) => handleFreightCustomNoteChange(e.target.value)}
                placeholder="e.g. Freight payable directly to transporter upon delivery at Delhi site"
                className={inputCls}
              />
            </div>
          )}

          {/* Dynamic Document Mention Banner */}
          <div className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200">
            <span className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300">
                PI Document Mention:
              </span>
              <span className="font-medium text-white">
                {getFreightMentionText(freightTerms, freightAmount, freightCustomNote)}
              </span>
            </span>
            <span className="font-mono font-bold text-white text-sm shrink-0">
              {Number(freightAmount || 0) > 0
                ? `₹ ${Number(freightAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                : (freightTerms || 'Extra as Actual / To pay')}
            </span>
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
            Place of Supply: {placeOfSupply} ({placeOfSupplyStateCode})
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
              {(installationCharge || 0) > 0 ? (
                <span className="text-[10px] text-[#7FB706] block font-mono">
                  @₹{effectiveInstallRate}/cubicle
                </span>
              ) : (
                <span className="text-[10px] text-emerald-400 block font-semibold">
                  {installationOption || 'Included'}
                </span>
              )}
            </span>
            <span className="text-white font-mono font-bold text-sm">
              ₹ {Number(installationCharge || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-3 bg-[#0a0a1a] rounded-xl border border-white/5">
            <span className="text-gray-400 block mb-1">
              Freight
              {freightAmount === 0 && (
                <span className={`text-[10px] block font-semibold ${
                  freightTerms === 'Included' ? 'text-emerald-400' : freightTerms === 'Client Scope' ? 'text-sky-400' : 'text-amber-400'
                }`}>
                  {freightTerms === 'Included' ? 'Included' : freightTerms === 'Client Scope' ? 'Client Scope' : 'Extra as Actual'}
                </span>
              )}
            </span>
            <span className="text-white font-mono font-bold text-sm">
              ₹ {freightAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-3 bg-[#0a0a1a] rounded-xl border border-white/5">
            <span className="text-gray-400 block mb-1">Net Taxable</span>
            <span className="text-white font-mono font-bold text-sm">
              ₹ {totalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-3 bg-[#0a0a1a] rounded-xl border border-white/5">
            <span className="text-gray-400 block mb-1">{advancePercentage}% Adv. Required</span>
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
            Required Advance ({advancePercentage}%): <span className="font-bold text-amber-400 font-mono text-base">₹ {requiredAdvance.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold rounded-xl text-sm transition cursor-pointer shadow-lg shadow-[#7FB706]/20 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {submitting ? 'Saving Proforma Invoice...' : 'Save Proforma Invoice'}
          </button>
        </div>
      </div>
    </form>
  );
}
