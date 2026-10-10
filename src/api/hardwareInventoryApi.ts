import apiClient from './client';
import type {
  ApiResponse,
  PaginatedResponse,
  HardwareInventoryItem,
  HardwareInventoryMaterial,
  HardwareStockMovement,
  HardwareBranch,
  HardwareVendor,
  HardwareAnalyticsSummary,
  CreateHardwareItemInput,
  UpdateHardwareItemInput,
  HardwareInwardInput,
  HardwareIssueInput,
  HardwareAdjustInput,
  CreateHardwareVendorInput,
  CreateHardwareBranchInput,
} from '../types/admin';

// Local storage persistent keys
const ITEMS_STORAGE_KEY = 'pacific_hardware_inventory_items_v1';
const MOVEMENTS_STORAGE_KEY = 'pacific_hardware_movements_v1';
const BRANCHES_STORAGE_KEY = 'pacific_hardware_branches_v1';
const VENDORS_STORAGE_KEY = 'pacific_hardware_vendors_v1';

// Initial default branches (Two branches, dynamic and expandable)
export const DEFAULT_HARDWARE_BRANCHES: HardwareBranch[] = [
  {
    id: 'branch-delhi',
    code: 'DELHI',
    name: 'Delhi Main Plant & Central Warehouse',
    city: 'Delhi / NCR',
    state: 'Delhi',
    address: 'Plot 42, Udyog Vihar Phase 4, Gurugram / Delhi NCR',
    phone: '+91 98112 34567',
    contactPerson: 'Harish Rawat (Store Incharge)',
    isDefault: true,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'branch-kolkata',
    code: 'KOLKATA',
    name: 'Kolkata Regional Hub & Warehouse',
    city: 'Kolkata',
    state: 'West Bengal',
    address: 'Kasba Industrial Estate, Phase 2, Kolkata 700107',
    phone: '+91 98300 77665',
    contactPerson: 'Prabir Roy (Warehouse Manager)',
    isDefault: false,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

// Initial approved Hardware Vendors
export const DEFAULT_HARDWARE_VENDORS: HardwareVendor[] = [
  {
    id: 'hvend-01',
    name: 'Pacific Precision Engineering Ltd',
    legalName: 'Pacific Precision Engineering Pvt Ltd',
    contactPerson: 'Manish Sharma',
    phone: '+91 98201 12345',
    email: 'hardware@pacificprecision.in',
    gstin: '07AAACP9812K1Z5',
    city: 'Gurugram',
    address: 'Plot 108, Pace City II, Sector 37, Gurugram, Haryana',
    materialCategories: ['STAINLESS_STEEL', 'ALUMINIUM'],
    totalSkus: 8,
    isActive: true,
    createdAt: '2026-01-10T00:00:00.000Z',
  },
  {
    id: 'hvend-02',
    name: 'Hettich India Hardware Allied',
    legalName: 'Hettich India Pvt Ltd',
    contactPerson: 'Sanjay Verma',
    phone: '+91 98110 54321',
    email: 'sales@hettich.in',
    gstin: '06AABCH4321P1Z9',
    city: 'New Delhi',
    address: 'Okhla Industrial Area, Phase III, New Delhi 110020',
    materialCategories: ['STAINLESS_STEEL'],
    totalSkus: 4,
    isActive: true,
    createdAt: '2026-01-12T00:00:00.000Z',
  },
  {
    id: 'hvend-03',
    name: 'Hindalco Extrusions & Architectural',
    legalName: 'Hindalco Industries Ltd',
    contactPerson: 'Arun Mukherjee',
    phone: '+91 98311 67890',
    email: 'profiles@hindalco.adityabirla.com',
    gstin: '19AAACH1234F1Z8',
    city: 'Kolkata',
    address: 'Birla Building, 9/1 R.N. Mukherjee Road, Kolkata 700001',
    materialCategories: ['ALUMINIUM'],
    totalSkus: 4,
    isActive: true,
    createdAt: '2026-01-15T00:00:00.000Z',
  },
  {
    id: 'hvend-04',
    name: 'TechnoPolymers Nylon Components',
    legalName: 'TechnoPolymers India LLP',
    contactPerson: 'Rajiv Sen',
    phone: '+91 97170 99887',
    email: 'orders@technopolymers.co.in',
    gstin: '07AABCT5544N1Z2',
    city: 'Faridabad',
    address: 'Sector 24, Industrial Area, Faridabad, Haryana 121005',
    materialCategories: ['NYLON'],
    totalSkus: 4,
    isActive: true,
    createdAt: '2026-01-20T00:00:00.000Z',
  },
];

// Initial realistic Pacific Restroom Cubicle Hardware Catalog Items
export const DEFAULT_HARDWARE_ITEMS: HardwareInventoryItem[] = [
  // SS Hardware (Colours: Black, Golden, Stainless Steel)
  {
    id: 'hw-item-01',
    sku: 'SS-HNG-304-SLV',
    name: 'SS Gravity Hinge (Pair)',
    material: 'STAINLESS_STEEL',
    color: 'Stainless Steel',
    unit: "Set's",
    hsnCode: '8302',
    warehouse: 'DELHI',
    vendorId: 'hvend-01',
    vendorName: 'Pacific Precision Engineering Ltd',
    openingStock: 140,
    currentStock: 140,
    totalInward: 140,
    totalIssued: 0,
    reorderLevel: 25,
    unitCost: 580,
    locationRack: 'RACK-SS-A1',
    status: 'ACTIVE',
    notes: 'Grade SS 304 satin brush finish, reversible open-in / open-out',
    createdAt: '2026-02-01T10:00:00.000Z',
    updatedAt: '2026-02-01T10:00:00.000Z',
  },
  {
    id: 'hw-item-02',
    sku: 'SS-HNG-304-BLK',
    name: 'SS Gravity Hinge (Pair) - Matt Black',
    material: 'STAINLESS_STEEL',
    color: 'Black',
    unit: "Set's",
    hsnCode: '8302',
    warehouse: 'DELHI',
    vendorId: 'hvend-01',
    vendorName: 'Pacific Precision Engineering Ltd',
    openingStock: 95,
    currentStock: 95,
    totalInward: 95,
    totalIssued: 0,
    reorderLevel: 20,
    unitCost: 680,
    locationRack: 'RACK-SS-A2',
    status: 'ACTIVE',
    notes: 'Grade SS 304 with black PVD coating, scratch resistant',
    createdAt: '2026-02-01T10:30:00.000Z',
    updatedAt: '2026-02-01T10:30:00.000Z',
  },
  {
    id: 'hw-item-03',
    sku: 'SS-HNG-304-GLD',
    name: 'SS Gravity Hinge (Pair) - Royal Gold',
    material: 'STAINLESS_STEEL',
    color: 'Golden',
    unit: "Set's",
    hsnCode: '8302',
    warehouse: 'DELHI',
    vendorId: 'hvend-02',
    vendorName: 'Hettich India Hardware Allied',
    openingStock: 42,
    currentStock: 42,
    totalInward: 42,
    totalIssued: 0,
    reorderLevel: 15,
    unitCost: 820,
    locationRack: 'RACK-SS-A3',
    status: 'ACTIVE',
    notes: 'PVD Titanium Gold finish, luxury commercial edition',
    createdAt: '2026-02-01T11:00:00.000Z',
    updatedAt: '2026-02-01T11:00:00.000Z',
  },
  {
    id: 'hw-item-04',
    sku: 'SS-LCK-IND-SLV',
    name: 'SS Indicator Thumbturn Lock',
    material: 'STAINLESS_STEEL',
    color: 'Stainless Steel',
    unit: "No's",
    hsnCode: '8302',
    warehouse: 'DELHI',
    vendorId: 'hvend-01',
    vendorName: 'Pacific Precision Engineering Ltd',
    openingStock: 210,
    currentStock: 210,
    totalInward: 210,
    totalIssued: 0,
    reorderLevel: 30,
    unitCost: 420,
    locationRack: 'RACK-SS-B1',
    status: 'ACTIVE',
    notes: 'Red/Green occupancy indicator with exterior coin emergency release',
    createdAt: '2026-02-01T11:30:00.000Z',
    updatedAt: '2026-02-01T11:30:00.000Z',
  },
  {
    id: 'hw-item-05',
    sku: 'SS-LCK-IND-BLK',
    name: 'SS Indicator Thumbturn Lock - Black',
    material: 'STAINLESS_STEEL',
    color: 'Black',
    unit: "No's",
    hsnCode: '8302',
    warehouse: 'KOLKATA',
    vendorId: 'hvend-01',
    vendorName: 'Pacific Precision Engineering Ltd',
    openingStock: 88,
    currentStock: 88,
    totalInward: 88,
    totalIssued: 0,
    reorderLevel: 20,
    unitCost: 510,
    locationRack: 'KOL-RACK-01',
    status: 'ACTIVE',
    notes: 'Matt black PVD finish with red/green disc indicator',
    createdAt: '2026-02-02T09:00:00.000Z',
    updatedAt: '2026-02-02T09:00:00.000Z',
  },
  {
    id: 'hw-item-06',
    sku: 'SS-LCK-IND-GLD',
    name: 'SS Indicator Thumbturn Lock - Golden',
    material: 'STAINLESS_STEEL',
    color: 'Golden',
    unit: "No's",
    hsnCode: '8302',
    warehouse: 'DELHI',
    vendorId: 'hvend-02',
    vendorName: 'Hettich India Hardware Allied',
    openingStock: 18,
    currentStock: 18,
    totalInward: 18,
    totalIssued: 0,
    reorderLevel: 15,
    unitCost: 650,
    locationRack: 'RACK-SS-B3',
    status: 'LOW_STOCK',
    notes: 'PVD Gold thumbturn latch with indicator',
    createdAt: '2026-02-02T09:30:00.000Z',
    updatedAt: '2026-02-02T09:30:00.000Z',
  },
  {
    id: 'hw-item-07',
    sku: 'SS-LEG-150-SLV',
    name: 'SS Adjustable Support Leg (100-150mm)',
    material: 'STAINLESS_STEEL',
    color: 'Stainless Steel',
    unit: "No's",
    hsnCode: '8302',
    warehouse: 'DELHI',
    vendorId: 'hvend-01',
    vendorName: 'Pacific Precision Engineering Ltd',
    openingStock: 180,
    currentStock: 180,
    totalInward: 180,
    totalIssued: 0,
    reorderLevel: 40,
    unitCost: 380,
    locationRack: 'RACK-SS-C1',
    status: 'ACTIVE',
    notes: 'Heavy duty SS 304 base with concealed anchor screw',
    createdAt: '2026-02-02T10:00:00.000Z',
    updatedAt: '2026-02-02T10:00:00.000Z',
  },
  {
    id: 'hw-item-08',
    sku: 'SS-CHK-BUF-SLV',
    name: 'SS Coat Hook with Rubber Buffer',
    material: 'STAINLESS_STEEL',
    color: 'Stainless Steel',
    unit: "No's",
    hsnCode: '8302',
    warehouse: 'KOLKATA',
    vendorId: 'hvend-01',
    vendorName: 'Pacific Precision Engineering Ltd',
    openingStock: 320,
    currentStock: 320,
    totalInward: 320,
    totalIssued: 0,
    reorderLevel: 50,
    unitCost: 140,
    locationRack: 'KOL-RACK-02',
    status: 'ACTIVE',
    notes: 'Dual purpose coat hook with black rubber door stop buffer',
    createdAt: '2026-02-02T10:30:00.000Z',
    updatedAt: '2026-02-02T10:30:00.000Z',
  },

  // Aluminium Hardware (Colours: Black, Aluminium colour)
  {
    id: 'hw-item-09',
    sku: 'AL-TR-3650-ALU',
    name: 'Aluminium Top Headrail Profile (3.65m)',
    material: 'ALUMINIUM',
    color: 'Aluminium colour',
    unit: 'Meters',
    hsnCode: '7610',
    warehouse: 'DELHI',
    vendorId: 'hvend-03',
    vendorName: 'Hindalco Extrusions & Architectural',
    openingStock: 480,
    currentStock: 480,
    totalInward: 480,
    totalIssued: 0,
    reorderLevel: 100,
    unitCost: 290,
    locationRack: 'BAY-AL-01',
    status: 'ACTIVE',
    notes: 'Grade 6063-T6 natural silver anodized, heavy D-section rail',
    createdAt: '2026-02-03T10:00:00.000Z',
    updatedAt: '2026-02-03T10:00:00.000Z',
  },
  {
    id: 'hw-item-10',
    sku: 'AL-TR-3650-BLK',
    name: 'Aluminium Top Headrail Profile - Matt Black',
    material: 'ALUMINIUM',
    color: 'Black',
    unit: 'Meters',
    hsnCode: '7610',
    warehouse: 'DELHI',
    vendorId: 'hvend-03',
    vendorName: 'Hindalco Extrusions & Architectural',
    openingStock: 310,
    currentStock: 310,
    totalInward: 310,
    totalIssued: 0,
    reorderLevel: 80,
    unitCost: 340,
    locationRack: 'BAY-AL-02',
    status: 'ACTIVE',
    notes: 'Black electro-anodized 20 microns finish',
    createdAt: '2026-02-03T10:30:00.000Z',
    updatedAt: '2026-02-03T10:30:00.000Z',
  },
  {
    id: 'hw-item-11',
    sku: 'AL-UCH-12-ALU',
    name: 'Aluminium U-Channel Wall Profile (12mm)',
    material: 'ALUMINIUM',
    color: 'Aluminium colour',
    unit: 'Meters',
    hsnCode: '7610',
    warehouse: 'KOLKATA',
    vendorId: 'hvend-03',
    vendorName: 'Hindalco Extrusions & Architectural',
    openingStock: 520,
    currentStock: 520,
    totalInward: 520,
    totalIssued: 0,
    reorderLevel: 120,
    unitCost: 180,
    locationRack: 'KOL-BAY-01',
    status: 'ACTIVE',
    notes: 'Standard 12mm compact laminate channel mounting',
    createdAt: '2026-02-03T11:00:00.000Z',
    updatedAt: '2026-02-03T11:00:00.000Z',
  },
  {
    id: 'hw-item-12',
    sku: 'AL-UCH-12-BLK',
    name: 'Aluminium U-Channel Wall Profile - Black',
    material: 'ALUMINIUM',
    color: 'Black',
    unit: 'Meters',
    hsnCode: '7610',
    warehouse: 'DELHI',
    vendorId: 'hvend-03',
    vendorName: 'Hindalco Extrusions & Architectural',
    openingStock: 75,
    currentStock: 75,
    totalInward: 75,
    totalIssued: 0,
    reorderLevel: 80,
    unitCost: 220,
    locationRack: 'BAY-AL-03',
    status: 'LOW_STOCK',
    notes: 'Architectural black powder coated U-channel',
    createdAt: '2026-02-03T11:30:00.000Z',
    updatedAt: '2026-02-03T11:30:00.000Z',
  },

  // Nylon Hardware (Colours: Black ONLY)
  {
    id: 'hw-item-13',
    sku: 'NY-HNG-BLK-01',
    name: 'Nylon Heavy-Duty Gravity Hinge (Pair)',
    material: 'NYLON',
    color: 'Black',
    unit: "Set's",
    hsnCode: '3926',
    warehouse: 'DELHI',
    vendorId: 'hvend-04',
    vendorName: 'TechnoPolymers Nylon Components',
    openingStock: 160,
    currentStock: 160,
    totalInward: 160,
    totalIssued: 0,
    reorderLevel: 30,
    unitCost: 280,
    locationRack: 'RACK-NY-01',
    status: 'ACTIVE',
    notes: 'Virgin polyamide 6 engineering nylon, antimicrobial and self-lubricating',
    createdAt: '2026-02-04T10:00:00.000Z',
    updatedAt: '2026-02-04T10:00:00.000Z',
  },
  {
    id: 'hw-item-14',
    sku: 'NY-LCK-BLK-01',
    name: 'Nylon Indicator Thumbturn Latch',
    material: 'NYLON',
    color: 'Black',
    unit: "No's",
    hsnCode: '3926',
    warehouse: 'DELHI',
    vendorId: 'hvend-04',
    vendorName: 'TechnoPolymers Nylon Components',
    openingStock: 190,
    currentStock: 190,
    totalInward: 190,
    totalIssued: 0,
    reorderLevel: 30,
    unitCost: 210,
    locationRack: 'RACK-NY-02',
    status: 'ACTIVE',
    notes: 'High-impact nylon privacy latch with red/white occupancy flag',
    createdAt: '2026-02-04T10:30:00.000Z',
    updatedAt: '2026-02-04T10:30:00.000Z',
  },
  {
    id: 'hw-item-15',
    sku: 'NY-LEG-BLK-01',
    name: 'Nylon Adjustable Support Foot (150mm)',
    material: 'NYLON',
    color: 'Black',
    unit: "No's",
    hsnCode: '3926',
    warehouse: 'KOLKATA',
    vendorId: 'hvend-04',
    vendorName: 'TechnoPolymers Nylon Components',
    openingStock: 140,
    currentStock: 140,
    totalInward: 140,
    totalIssued: 0,
    reorderLevel: 25,
    unitCost: 190,
    locationRack: 'KOL-RACK-03',
    status: 'ACTIVE',
    notes: 'Non-corrosive nylon pedestal leg for high-moisture washrooms',
    createdAt: '2026-02-04T11:00:00.000Z',
    updatedAt: '2026-02-04T11:00:00.000Z',
  },
  {
    id: 'hw-item-16',
    sku: 'NY-CHK-BLK-01',
    name: 'Nylon Coat Hook with Integrated Bumper',
    material: 'NYLON',
    color: 'Black',
    unit: "No's",
    hsnCode: '3926',
    warehouse: 'DELHI',
    vendorId: 'hvend-04',
    vendorName: 'TechnoPolymers Nylon Components',
    openingStock: 240,
    currentStock: 240,
    totalInward: 240,
    totalIssued: 0,
    reorderLevel: 40,
    unitCost: 65,
    locationRack: 'RACK-NY-04',
    status: 'ACTIVE',
    notes: 'Sturdy black nylon hook with door cushion',
    createdAt: '2026-02-04T11:30:00.000Z',
    updatedAt: '2026-02-04T11:30:00.000Z',
  },
];

// Helper to get allowed standard colors by material
export function getAllowedColorsForMaterial(material: string): string[] {
  const norm = material.toUpperCase();
  if (norm === 'STAINLESS_STEEL' || norm.includes('SS') || norm.includes('STEEL')) {
    return ['Black', 'Golden', 'Stainless Steel'];
  }
  if (norm === 'ALUMINIUM' || norm.includes('ALU')) {
    return ['Black', 'Aluminium colour'];
  }
  if (norm === 'NYLON') {
    return ['Black'];
  }
  return ['Black', 'Silver', 'Grey', 'Custom'];
}

// Helper to suggest SKU (user still has full manual freedom to edit or type anything)
export function suggestHardwareSku(
  material: string,
  itemName: string,
  color: string,
  warehouse?: string
): string {
  const matPrefix =
    material === 'STAINLESS_STEEL' ? 'SS' : material === 'ALUMINIUM' ? 'AL' : material === 'NYLON' ? 'NY' : 'HW';

  const cleanName = itemName
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.substring(0, 3).toUpperCase())
    .join('-');

  const colCode =
    color.toLowerCase().includes('black')
      ? 'BLK'
      : color.toLowerCase().includes('gold')
      ? 'GLD'
      : color.toLowerCase().includes('steel')
      ? 'SLV'
      : color.toLowerCase().includes('alu')
      ? 'ALU'
      : 'STD';

  const suffix = Math.floor(100 + Math.random() * 900);
  return `${matPrefix}-${cleanName || 'ITEM'}-${colCode}-${suffix}`;
}

// In-memory + LocalStorage store manager
class HardwareStore {
  private getStorage<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const data = localStorage.getItem(key);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn(`[HardwareStore] Failed to read ${key}:`, e);
    }
    this.setStorage(key, defaultValue);
    return defaultValue;
  }

  private setStorage<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`[HardwareStore] Failed to write ${key}:`, e);
    }
  }

  getItems(): HardwareInventoryItem[] {
    return this.getStorage<HardwareInventoryItem[]>(ITEMS_STORAGE_KEY, DEFAULT_HARDWARE_ITEMS);
  }

  saveItems(items: HardwareInventoryItem[]): void {
    this.setStorage(ITEMS_STORAGE_KEY, items);
  }

  getMovements(): HardwareStockMovement[] {
    return this.getStorage<HardwareStockMovement[]>(MOVEMENTS_STORAGE_KEY, []);
  }

  saveMovements(movements: HardwareStockMovement[]): void {
    this.setStorage(MOVEMENTS_STORAGE_KEY, movements);
  }

  getBranches(): HardwareBranch[] {
    return this.getStorage<HardwareBranch[]>(BRANCHES_STORAGE_KEY, DEFAULT_HARDWARE_BRANCHES);
  }

  saveBranches(branches: HardwareBranch[]): void {
    this.setStorage(BRANCHES_STORAGE_KEY, branches);
  }

  getVendors(): HardwareVendor[] {
    return this.getStorage<HardwareVendor[]>(VENDORS_STORAGE_KEY, DEFAULT_HARDWARE_VENDORS);
  }

  saveVendors(vendors: HardwareVendor[]): void {
    this.setStorage(VENDORS_STORAGE_KEY, vendors);
  }
}

const store = new HardwareStore();

export const hardwareInventoryApi = {
  // ── Items Master ──────────────────────────────────────────
  list: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    warehouse?: string;
    material?: string;
    color?: string;
    unit?: string;
    vendorId?: string;
    status?: string;
  }): Promise<{ data: ApiResponse<PaginatedResponse<HardwareInventoryItem>> }> => {
    // Try backend if available
    try {
      const res = await apiClient.get<ApiResponse<PaginatedResponse<HardwareInventoryItem>>>(
        '/inventory/hardware',
        { params }
      );
      if (res.data?.success && res.data.data?.items) {
        return { data: res.data };
      }
    } catch {
      // Fallback to local storage store
    }

    let items = store.getItems();
    const page = params?.page || 1;
    const limit = params?.limit || 25;

    // Filters
    if (params?.warehouse && params.warehouse !== 'ALL') {
      items = items.filter((i) => i.warehouse.toUpperCase() === params.warehouse!.toUpperCase());
    }
    if (params?.material && params.material !== 'ALL') {
      items = items.filter((i) => i.material === params.material);
    }
    if (params?.color && params.color !== 'ALL') {
      items = items.filter((i) => i.color.toLowerCase() === params.color!.toLowerCase());
    }
    if (params?.unit && params.unit !== 'ALL') {
      items = items.filter((i) => i.unit === params.unit);
    }
    if (params?.vendorId && params.vendorId !== 'ALL') {
      items = items.filter((i) => i.vendorId === params.vendorId);
    }
    if (params?.status && params.status !== 'ALL') {
      items = items.filter((i) => i.status === params.status);
    }
    if (params?.search && params.search.trim()) {
      const q = params.search.toLowerCase().trim();
      items = items.filter(
        (i) =>
          i.sku.toLowerCase().includes(q) ||
          i.name.toLowerCase().includes(q) ||
          (i.hsnCode && i.hsnCode.includes(q)) ||
          (i.vendorName && i.vendorName.toLowerCase().includes(q)) ||
          (i.locationRack && i.locationRack.toLowerCase().includes(q))
      );
    }

    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const startIndex = (page - 1) * limit;
    const paginatedItems = items.slice(startIndex, startIndex + limit);

    return {
      data: {
        success: true,
        data: {
          items: paginatedItems,
          total,
          page,
          limit,
          totalPages,
        },
      },
    };
  },

  getById: async (id: string): Promise<{ data: ApiResponse<HardwareInventoryItem> }> => {
    try {
      const res = await apiClient.get<ApiResponse<HardwareInventoryItem>>(`/inventory/hardware/${id}`);
      if (res.data?.success && res.data.data) {
        return { data: res.data };
      }
    } catch {}

    const items = store.getItems();
    const found = items.find((i) => i.id === id || i.sku.toUpperCase() === id.toUpperCase());
    if (!found) {
      throw new Error(`Hardware item ${id} not found`);
    }
    return {
      data: {
        success: true,
        data: found,
      },
    };
  },

  create: async (
    data: CreateHardwareItemInput
  ): Promise<{ data: ApiResponse<HardwareInventoryItem> }> => {
    try {
      const res = await apiClient.post<ApiResponse<HardwareInventoryItem>>('/inventory/hardware', data);
      if (res.data?.success && res.data.data) {
        return { data: res.data };
      }
    } catch {}

    const items = store.getItems();
    const now = new Date().toISOString();
    const openingStock = Number(data.openingStock) || 0;
    const reorderLevel = Number(data.reorderLevel) || 10;
    const unitCost = Number(data.unitCost) || 0;

    let initialStatus: HardwareInventoryItem['status'] = 'ACTIVE';
    if (openingStock <= 0) initialStatus = 'OUT_OF_STOCK';
    else if (openingStock <= reorderLevel) initialStatus = 'LOW_STOCK';

    const newItem: HardwareInventoryItem = {
      id: `hw-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      sku: data.sku.trim().toUpperCase(),
      name: data.name.trim(),
      material: data.material as HardwareInventoryMaterial,
      color: data.color.trim(),
      unit: data.unit || "No's",
      hsnCode: data.hsnCode?.trim() || '8302',
      warehouse: (data.warehouse || 'DELHI').toUpperCase(),
      vendorId: data.vendorId || '',
      vendorName: data.vendorName || '',
      openingStock,
      currentStock: openingStock,
      totalInward: openingStock,
      totalIssued: 0,
      reorderLevel,
      unitCost,
      locationRack: data.locationRack?.trim() || '',
      status: initialStatus,
      notes: data.notes?.trim() || '',
      createdAt: now,
      updatedAt: now,
    };

    items.unshift(newItem);
    store.saveItems(items);

    // If opening stock > 0, log an initial inward movement
    if (openingStock > 0) {
      const movements = store.getMovements();
      const initialMovement: HardwareStockMovement = {
        id: `mov-${Date.now()}`,
        movementNumber: `MOV-HW-${Date.now().toString().slice(-6)}`,
        hardwareItemId: newItem.id,
        sku: newItem.sku,
        hardwareName: newItem.name,
        material: newItem.material,
        warehouse: newItem.warehouse,
        movementType: 'INWARD',
        movementDate: now.slice(0, 10),
        quantity: openingStock,
        stockBefore: 0,
        stockAfter: openingStock,
        unit: newItem.unit,
        unitCost,
        totalValue: openingStock * unitCost,
        notes: 'Initial opening stock registration',
        createdAt: now,
      };
      movements.unshift(initialMovement);
      store.saveMovements(movements);
    }

    return {
      data: {
        success: true,
        data: newItem,
      },
    };
  },

  update: async (
    id: string,
    data: UpdateHardwareItemInput
  ): Promise<{ data: ApiResponse<HardwareInventoryItem> }> => {
    try {
      const res = await apiClient.put<ApiResponse<HardwareInventoryItem>>(`/inventory/hardware/${id}`, data);
      if (res.data?.success && res.data.data) {
        return { data: res.data };
      }
    } catch {}

    const items = store.getItems();
    const index = items.findIndex((i) => i.id === id);
    if (index === -1) throw new Error(`Hardware item ${id} not found`);

    const current = items[index];
    const updated: HardwareInventoryItem = {
      ...current,
      sku: data.sku !== undefined ? data.sku.trim().toUpperCase() : current.sku,
      name: data.name !== undefined ? data.name.trim() : current.name,
      material: data.material !== undefined ? (data.material as HardwareInventoryMaterial) : current.material,
      color: data.color !== undefined ? data.color.trim() : current.color,
      unit: data.unit !== undefined ? data.unit : current.unit,
      hsnCode: data.hsnCode !== undefined ? data.hsnCode.trim() : current.hsnCode,
      warehouse: data.warehouse !== undefined ? data.warehouse.toUpperCase() : current.warehouse,
      vendorId: data.vendorId !== undefined ? data.vendorId : current.vendorId,
      vendorName: data.vendorName !== undefined ? data.vendorName : current.vendorName,
      currentStock: data.currentStock !== undefined ? Number(data.currentStock) : current.currentStock,
      reorderLevel: data.reorderLevel !== undefined ? Number(data.reorderLevel) : current.reorderLevel,
      unitCost: data.unitCost !== undefined ? Number(data.unitCost) : current.unitCost,
      locationRack: data.locationRack !== undefined ? data.locationRack.trim() : current.locationRack,
      status: (data.status as any) || current.status,
      notes: data.notes !== undefined ? data.notes.trim() : current.notes,
      updatedAt: new Date().toISOString(),
    };

    items[index] = updated;
    store.saveItems(items);

    return {
      data: {
        success: true,
        data: updated,
      },
    };
  },

  delete: async (id: string): Promise<{ data: ApiResponse<{ success: boolean }> }> => {
    try {
      const res = await apiClient.delete<ApiResponse<{ success: boolean }>>(`/inventory/hardware/${id}`);
      if (res.data?.success) return { data: res.data };
    } catch {}

    let items = store.getItems();
    items = items.filter((i) => i.id !== id);
    store.saveItems(items);

    return {
      data: {
        success: true,
        data: { success: true },
      },
    };
  },

  // ── Stock Inward ──────────────────────────────────────────
  inward: async (
    data: HardwareInwardInput
  ): Promise<{ data: ApiResponse<{ item: HardwareInventoryItem; movement: HardwareStockMovement }> }> => {
    try {
      const res = await apiClient.post<
        ApiResponse<{ item: HardwareInventoryItem; movement: HardwareStockMovement }>
      >('/inventory/hardware/inward', data);
      if (res.data?.success) return { data: res.data };
    } catch {}

    const items = store.getItems();
    const itemIndex = items.findIndex((i) => i.id === data.hardwareItemId);
    if (itemIndex === -1) throw new Error('Selected hardware item was not found.');

    const item = items[itemIndex];
    const qty = Number(data.quantity) || 0;
    if (qty <= 0) throw new Error('Inward quantity must be greater than zero.');

    const stockBefore = item.currentStock;
    const stockAfter = stockBefore + qty;
    const unitCost = data.unitCost !== undefined ? Number(data.unitCost) : item.unitCost;
    const now = new Date().toISOString();

    const movement: HardwareStockMovement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      movementNumber: `INW-${Date.now().toString().slice(-6)}`,
      hardwareItemId: item.id,
      sku: item.sku,
      hardwareName: item.name,
      material: item.material,
      warehouse: data.warehouse || item.warehouse,
      movementType: 'INWARD',
      movementDate: data.supplierInvoiceDate || now.slice(0, 10),
      quantity: qty,
      stockBefore,
      stockAfter,
      unit: item.unit,
      supplierInvoiceNo: data.supplierInvoiceNo?.trim(),
      supplierInvoiceDate: data.supplierInvoiceDate,
      batchLotNo: data.batchLotNo?.trim(),
      unitCost,
      totalValue: qty * unitCost,
      notes: data.notes?.trim(),
      createdAt: now,
    };

    // Update item stock
    const updatedStatus: HardwareInventoryItem['status'] =
      stockAfter <= 0 ? 'OUT_OF_STOCK' : stockAfter <= item.reorderLevel ? 'LOW_STOCK' : 'ACTIVE';

    const updatedItem: HardwareInventoryItem = {
      ...item,
      currentStock: stockAfter,
      totalInward: item.totalInward + qty,
      unitCost,
      status: updatedStatus,
      locationRack: data.locationRack?.trim() || item.locationRack,
      updatedAt: now,
    };

    items[itemIndex] = updatedItem;
    store.saveItems(items);

    const movements = store.getMovements();
    movements.unshift(movement);
    store.saveMovements(movements);

    return {
      data: {
        success: true,
        data: {
          item: updatedItem,
          movement,
        },
      },
    };
  },

  // ── Stock Issue ───────────────────────────────────────────
  issue: async (
    data: HardwareIssueInput
  ): Promise<{ data: ApiResponse<{ item: HardwareInventoryItem; movement: HardwareStockMovement }> }> => {
    try {
      const res = await apiClient.post<
        ApiResponse<{ item: HardwareInventoryItem; movement: HardwareStockMovement }>
      >('/inventory/hardware/issue', data);
      if (res.data?.success) return { data: res.data };
    } catch {}

    const items = store.getItems();
    const itemIndex = items.findIndex((i) => i.id === data.hardwareItemId);
    if (itemIndex === -1) throw new Error('Selected hardware item was not found.');

    const item = items[itemIndex];
    const qty = Number(data.quantity) || 0;
    if (qty <= 0) throw new Error('Issue quantity must be greater than zero.');

    if (item.currentStock < qty) {
      throw new Error(`Insufficient stock. Current available: ${item.currentStock} ${item.unit}`);
    }

    const stockBefore = item.currentStock;
    const stockAfter = stockBefore - qty;
    const now = new Date().toISOString();

    const movement: HardwareStockMovement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      movementNumber: `ISS-${Date.now().toString().slice(-6)}`,
      hardwareItemId: item.id,
      sku: item.sku,
      hardwareName: item.name,
      material: item.material,
      warehouse: data.warehouse || item.warehouse,
      movementType: 'ISSUE',
      movementDate: now.slice(0, 10),
      quantity: qty,
      stockBefore,
      stockAfter,
      unit: item.unit,
      issueReference: data.issueReference?.trim(),
      issuedToPerson: data.issuedToPerson?.trim(),
      unitCost: item.unitCost,
      totalValue: qty * item.unitCost,
      notes: data.notes?.trim(),
      createdAt: now,
    };

    const updatedStatus: HardwareInventoryItem['status'] =
      stockAfter <= 0 ? 'OUT_OF_STOCK' : stockAfter <= item.reorderLevel ? 'LOW_STOCK' : 'ACTIVE';

    const updatedItem: HardwareInventoryItem = {
      ...item,
      currentStock: stockAfter,
      totalIssued: item.totalIssued + qty,
      status: updatedStatus,
      updatedAt: now,
    };

    items[itemIndex] = updatedItem;
    store.saveItems(items);

    const movements = store.getMovements();
    movements.unshift(movement);
    store.saveMovements(movements);

    return {
      data: {
        success: true,
        data: {
          item: updatedItem,
          movement,
        },
      },
    };
  },

  // ── Stock Adjustment ──────────────────────────────────────
  adjust: async (
    data: HardwareAdjustInput
  ): Promise<{ data: ApiResponse<{ item: HardwareInventoryItem; movement: HardwareStockMovement }> }> => {
    const items = store.getItems();
    const itemIndex = items.findIndex((i) => i.id === data.hardwareItemId);
    if (itemIndex === -1) throw new Error('Selected hardware item was not found.');

    const item = items[itemIndex];
    const qty = Number(data.adjustedQuantity) || 0;
    if (qty <= 0) throw new Error('Adjustment quantity must be greater than zero.');

    const stockBefore = item.currentStock;
    let stockAfter = stockBefore;

    if (data.type === 'ADD') {
      stockAfter = stockBefore + qty;
    } else {
      if (stockBefore < qty) throw new Error('Cannot reduce stock below zero.');
      stockAfter = stockBefore - qty;
    }

    const now = new Date().toISOString();
    const movement: HardwareStockMovement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      movementNumber: `ADJ-${Date.now().toString().slice(-6)}`,
      hardwareItemId: item.id,
      sku: item.sku,
      hardwareName: item.name,
      material: item.material,
      warehouse: item.warehouse,
      movementType: data.type === 'ADD' ? 'ADJUSTMENT_ADD' : 'ADJUSTMENT_SUB',
      movementDate: now.slice(0, 10),
      quantity: qty,
      stockBefore,
      stockAfter,
      unit: item.unit,
      unitCost: item.unitCost,
      totalValue: qty * item.unitCost,
      notes: `${data.reason}: ${data.notes || ''}`.trim(),
      createdAt: now,
    };

    const updatedStatus: HardwareInventoryItem['status'] =
      stockAfter <= 0 ? 'OUT_OF_STOCK' : stockAfter <= item.reorderLevel ? 'LOW_STOCK' : 'ACTIVE';

    const updatedItem: HardwareInventoryItem = {
      ...item,
      currentStock: stockAfter,
      status: updatedStatus,
      updatedAt: now,
    };

    items[itemIndex] = updatedItem;
    store.saveItems(items);

    const movements = store.getMovements();
    movements.unshift(movement);
    store.saveMovements(movements);

    return {
      data: {
        success: true,
        data: {
          item: updatedItem,
          movement,
        },
      },
    };
  },

  // ── Movements Audit Ledger ────────────────────────────────
  getMovements: async (params?: {
    hardwareItemId?: string;
    warehouse?: string;
    movementType?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<{ data: ApiResponse<HardwareStockMovement[]> }> => {
    let movements = store.getMovements();

    if (params?.hardwareItemId) {
      movements = movements.filter((m) => m.hardwareItemId === params.hardwareItemId);
    }
    if (params?.warehouse && params.warehouse !== 'ALL') {
      movements = movements.filter((m) => m.warehouse.toUpperCase() === params.warehouse!.toUpperCase());
    }
    if (params?.movementType && params.movementType !== 'ALL') {
      movements = movements.filter((m) => m.movementType === params.movementType);
    }
    if (params?.startDate) {
      movements = movements.filter((m) => m.movementDate >= params.startDate!);
    }
    if (params?.endDate) {
      movements = movements.filter((m) => m.movementDate <= params.endDate!);
    }

    if (params?.limit) {
      movements = movements.slice(0, params.limit);
    }

    return {
      data: {
        success: true,
        data: movements,
      },
    };
  },

  // ── Analytics & Live Metrics ──────────────────────────────
  getAnalytics: async (params?: {
    warehouse?: string;
  }): Promise<{ data: ApiResponse<HardwareAnalyticsSummary> }> => {
    let items = store.getItems();
    let movements = store.getMovements();

    if (params?.warehouse && params.warehouse !== 'ALL') {
      items = items.filter((i) => i.warehouse.toUpperCase() === params.warehouse!.toUpperCase());
      movements = movements.filter((m) => m.warehouse.toUpperCase() === params.warehouse!.toUpperCase());
    }

    const totalSkus = items.length;
    let totalUnits = 0;
    let totalValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const materialDistribution: Record<string, { skus: number; units: number; valuation: number }> = {};
    const branchDistribution: Record<string, { skus: number; units: number; valuation: number }> = {};
    const colorDistribution: Record<string, number> = {};
    const unitDistribution: Record<string, number> = {};

    items.forEach((item) => {
      const stock = Number(item.currentStock) || 0;
      const cost = Number(item.unitCost) || 0;
      const val = stock * cost;

      totalUnits += stock;
      totalValuation += val;

      if (stock <= 0) outOfStockCount++;
      else if (stock <= item.reorderLevel) lowStockCount++;

      // Material
      const mat = item.material || 'OTHER';
      if (!materialDistribution[mat]) materialDistribution[mat] = { skus: 0, units: 0, valuation: 0 };
      materialDistribution[mat].skus++;
      materialDistribution[mat].units += stock;
      materialDistribution[mat].valuation += val;

      // Branch
      const br = item.warehouse || 'DELHI';
      if (!branchDistribution[br]) branchDistribution[br] = { skus: 0, units: 0, valuation: 0 };
      branchDistribution[br].skus++;
      branchDistribution[br].units += stock;
      branchDistribution[br].valuation += val;

      // Color
      const col = item.color || 'Standard';
      colorDistribution[col] = (colorDistribution[col] || 0) + 1;

      // Unit
      const u = item.unit || "No's";
      unitDistribution[u] = (unitDistribution[u] || 0) + 1;
    });

    let periodInward = 0;
    let periodIssued = 0;
    movements.forEach((m) => {
      if (m.movementType === 'INWARD') periodInward += Number(m.quantity) || 0;
      if (m.movementType === 'ISSUE') periodIssued += Number(m.quantity) || 0;
    });

    return {
      data: {
        success: true,
        data: {
          totalSkus,
          totalUnits,
          totalValuation,
          lowStockCount,
          outOfStockCount,
          periodInward,
          periodIssued,
          materialDistribution,
          branchDistribution,
          colorDistribution,
          unitDistribution,
        },
      },
    };
  },

  // ── Dynamic Branch Management ─────────────────────────────
  listBranches: async (): Promise<{ data: ApiResponse<HardwareBranch[]> }> => {
    const branches = store.getBranches();
    return {
      data: {
        success: true,
        data: branches,
      },
    };
  },

  createBranch: async (
    data: CreateHardwareBranchInput
  ): Promise<{ data: ApiResponse<HardwareBranch> }> => {
    const branches = store.getBranches();
    const code = data.code.trim().toUpperCase();

    if (branches.some((b) => b.code.toUpperCase() === code)) {
      throw new Error(`Branch with code "${code}" already exists.`);
    }

    const newBranch: HardwareBranch = {
      id: `branch-${Date.now()}`,
      code,
      name: data.name.trim(),
      city: data.city.trim(),
      state: data.state.trim(),
      address: data.address?.trim(),
      phone: data.phone?.trim(),
      contactPerson: data.contactPerson?.trim(),
      isDefault: false,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    branches.push(newBranch);
    store.saveBranches(branches);

    return {
      data: {
        success: true,
        data: newBranch,
      },
    };
  },

  updateBranch: async (
    id: string,
    data: Partial<HardwareBranch>
  ): Promise<{ data: ApiResponse<HardwareBranch> }> => {
    const branches = store.getBranches();
    const idx = branches.findIndex((b) => b.id === id);
    if (idx === -1) throw new Error('Branch not found.');

    branches[idx] = { ...branches[idx], ...data };
    store.saveBranches(branches);

    return {
      data: {
        success: true,
        data: branches[idx],
      },
    };
  },

  // ── Hardware Vendor Management ────────────────────────────
  listVendors: async (): Promise<{ data: ApiResponse<HardwareVendor[]> }> => {
    const vendors = store.getVendors();
    const items = store.getItems();

    // Dynamically update totalSkus supplied per vendor
    const updated = vendors.map((v) => {
      const skus = items.filter((i) => i.vendorId === v.id).length;
      return { ...v, totalSkus: skus };
    });

    return {
      data: {
        success: true,
        data: updated,
      },
    };
  },

  createVendor: async (
    data: CreateHardwareVendorInput
  ): Promise<{ data: ApiResponse<HardwareVendor> }> => {
    const vendors = store.getVendors();
    const newVendor: HardwareVendor = {
      id: `hvend-${Date.now()}`,
      name: data.name.trim(),
      legalName: data.legalName?.trim() || data.name.trim(),
      contactPerson: data.contactPerson?.trim(),
      phone: data.phone.trim(),
      email: data.email?.trim(),
      gstin: data.gstin?.trim()?.toUpperCase(),
      city: data.city?.trim(),
      address: data.address?.trim(),
      materialCategories: data.materialCategories || ['STAINLESS_STEEL'],
      totalSkus: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    vendors.unshift(newVendor);
    store.saveVendors(vendors);

    return {
      data: {
        success: true,
        data: newVendor,
      },
    };
  },

  updateVendor: async (
    id: string,
    data: Partial<HardwareVendor>
  ): Promise<{ data: ApiResponse<HardwareVendor> }> => {
    const vendors = store.getVendors();
    const idx = vendors.findIndex((v) => v.id === id);
    if (idx === -1) throw new Error('Vendor not found.');

    vendors[idx] = { ...vendors[idx], ...data };
    store.saveVendors(vendors);

    return {
      data: {
        success: true,
        data: vendors[idx],
      },
    };
  },
};
