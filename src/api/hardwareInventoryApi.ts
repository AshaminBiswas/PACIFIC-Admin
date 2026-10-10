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

// Local storage persistent keys (isolated v2 storage to eradicate dummy data)
const ITEMS_STORAGE_KEY = 'pacific_hardware_inventory_items_v2';
const MOVEMENTS_STORAGE_KEY = 'pacific_hardware_movements_v2';
const BRANCHES_STORAGE_KEY = 'pacific_hardware_branches_v1';
const VENDORS_STORAGE_KEY = 'pacific_hardware_vendors_v2';
const LEGACY_STORAGE_KEYS = [
  'pacific_hardware_inventory_items_v1',
  'pacific_hardware_movements_v1',
  'pacific_hardware_vendors_v1',
];

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

// Approved Hardware Vendors (starts empty for user's real data)
export const DEFAULT_HARDWARE_VENDORS: HardwareVendor[] = [];

// Hardware Catalog Items (starts clean and empty - no dummy records)
export const DEFAULT_HARDWARE_ITEMS: HardwareInventoryItem[] = [];

// Known dummy hardware item SKUs to permanently eradicate
const DUMMY_HARDWARE_SKUS = new Set([
  'SS-HNG-304-SLV',
  'SS-HNG-304-BLK',
  'SS-HNG-304-GLD',
  'SS-LCK-IND-SLV',
  'SS-LCK-IND-BLK',
  'SS-LCK-IND-GLD',
  'SS-LEG-150-SLV',
  'SS-CHK-BUF-SLV',
  'AL-TR-3650-ALU',
  'AL-TR-3650-BLK',
  'AL-UCH-12-ALU',
  'AL-UCH-12-BLK',
  'NY-HNG-BLK-01',
  'NY-LCK-BLK-01',
  'NY-LEG-BLK-01',
  'NY-CHK-BLK-01',
]);

const DUMMY_VENDOR_NAMES = new Set([
  'pacific precision engineering ltd',
  'hettich india hardware allied',
  'hindalco extrusions & architectural',
  'technopolymers nylon components',
]);

/**
 * Universal detector for legacy demo dummy hardware items.
 */
export function isDummyHardwareItem(item: Partial<HardwareInventoryItem> | null | undefined): boolean {
  if (!item) return false;
  const id = String(item.id || '').toLowerCase();
  if (id.startsWith('hw-item-')) return true;
  const sku = String(item.sku || '').toUpperCase();
  if (DUMMY_HARDWARE_SKUS.has(sku)) return true;
  return false;
}

/**
 * Universal detector for legacy demo dummy hardware vendors.
 */
export function isDummyHardwareVendor(vendor: Partial<HardwareVendor> | null | undefined): boolean {
  if (!vendor) return false;
  const id = String(vendor.id || '').toLowerCase();
  if (id.startsWith('hvend-0')) return true;
  const name = String(vendor.name || '').toLowerCase().trim();
  if (DUMMY_VENDOR_NAMES.has(name)) return true;
  return false;
}


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
  constructor() {
    // Purge legacy storage keys containing demo dummy data
    if (typeof window !== 'undefined') {
      try {
        LEGACY_STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
      } catch (e) {
        console.warn('[HardwareStore] Failed to purge legacy keys:', e);
      }
    }
  }

  getStorage<T>(key: string, defaultValue: T): T {
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

  setStorage<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`[HardwareStore] Failed to write ${key}:`, e);
    }
  }

  getItems(): HardwareInventoryItem[] {
    const raw = this.getStorage<HardwareInventoryItem[]>(ITEMS_STORAGE_KEY, []);
    const clean = raw.filter((i) => !isDummyHardwareItem(i));
    if (clean.length !== raw.length) {
      this.saveItems(clean);
    }
    return clean;
  }

  saveItems(items: HardwareInventoryItem[]): void {
    const clean = items.filter((i) => !isDummyHardwareItem(i));
    this.setStorage(ITEMS_STORAGE_KEY, clean);
  }

  getMovements(): HardwareStockMovement[] {
    const raw = this.getStorage<HardwareStockMovement[]>(MOVEMENTS_STORAGE_KEY, []);
    const clean = raw.filter((m) => {
      if (m.hardwareItemId && m.hardwareItemId.startsWith('hw-item-')) return false;
      if (m.sku && DUMMY_HARDWARE_SKUS.has(m.sku.toUpperCase())) return false;
      return true;
    });
    if (clean.length !== raw.length) {
      this.saveMovements(clean);
    }
    return clean;
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
    const raw = this.getStorage<HardwareVendor[]>(VENDORS_STORAGE_KEY, []);
    const clean = raw.filter((v) => !isDummyHardwareVendor(v));
    if (clean.length !== raw.length) {
      this.saveVendors(clean);
    }
    return clean;
  }

  saveVendors(vendors: HardwareVendor[]): void {
    const clean = vendors.filter((v) => !isDummyHardwareVendor(v));
    this.setStorage(VENDORS_STORAGE_KEY, clean);
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

  // ── Maintenance & Clean-Slate Helpers ─────────────────────
  clearAllItems: async (): Promise<{ data: ApiResponse<{ success: boolean }> }> => {
    store.saveItems([]);
    store.saveMovements([]);
    return {
      data: {
        success: true,
        data: { success: true },
      },
    };
  },

  purgeDummyData: async (): Promise<{
    data: ApiResponse<{ success: boolean; purgedItems: number; purgedVendors: number }>;
  }> => {
    const rawItems = store.getStorage<HardwareInventoryItem[]>(ITEMS_STORAGE_KEY, []);
    const cleanItems = rawItems.filter((i) => !isDummyHardwareItem(i));
    store.saveItems(cleanItems);

    const rawMovements = store.getStorage<HardwareStockMovement[]>(MOVEMENTS_STORAGE_KEY, []);
    const cleanMovements = rawMovements.filter(
      (m) =>
        !(m.hardwareItemId && m.hardwareItemId.startsWith('hw-item-')) &&
        !(m.sku && DUMMY_HARDWARE_SKUS.has(m.sku.toUpperCase()))
    );
    store.saveMovements(cleanMovements);

    const rawVendors = store.getStorage<HardwareVendor[]>(VENDORS_STORAGE_KEY, []);
    const cleanVendors = rawVendors.filter((v) => !isDummyHardwareVendor(v));
    store.saveVendors(cleanVendors);

    // Also purge legacy v1 keys
    if (typeof window !== 'undefined') {
      try {
        LEGACY_STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
      } catch {}
    }

    return {
      data: {
        success: true,
        data: {
          success: true,
          purgedItems: rawItems.length - cleanItems.length,
          purgedVendors: rawVendors.length - cleanVendors.length,
        },
      },
    };
  },
};
