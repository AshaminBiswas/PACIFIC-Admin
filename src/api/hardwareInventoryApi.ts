import apiClient from './client';
import { supabase } from '../lib/supabase';
import type {
  ApiResponse,
  PaginatedResponse,
  HardwareInventoryItem,
  HardwareInventoryMaterial,
  HardwareStockMovement,
  HardwareMovementType,
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
  'pacific precision engineering pvt ltd',
  'hettich india hardware allied',
  'hettich india pvt ltd',
  'hindalco extrusions & architectural',
  'hindalco industries ltd',
  'technopolymers nylon components',
  'technopolymers india llp',
]);

const DUMMY_VENDOR_GSTINS = new Set([
  '07AAACP9812K1Z5',
  '06AABCH4321P1Z9',
  '19AAACH1234F1Z8',
  '07AABCT5544N1Z2',
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
 * Matches by ID, Name, Legal Name, Email, or GSTIN.
 */
export function isDummyHardwareVendor(vendor: Partial<HardwareVendor> | null | undefined): boolean {
  if (!vendor) return false;
  const id = String(vendor.id || '').toLowerCase();
  if (/^hvend-0[1-9]/.test(id)) return true;
  const name = String(vendor.name || '').toLowerCase().trim();
  const legalName = String(vendor.legalName || '').toLowerCase().trim();
  if (
    DUMMY_VENDOR_NAMES.has(name) ||
    DUMMY_VENDOR_NAMES.has(legalName) ||
    name.includes('pacific precision') ||
    legalName.includes('pacific precision') ||
    name.includes('hettich india') ||
    legalName.includes('hettich india') ||
    name.includes('hindalco') ||
    legalName.includes('hindalco') ||
    name.includes('technopolymers') ||
    legalName.includes('technopolymers')
  ) {
    return true;
  }
  const gstin = String(vendor.gstin || '').toUpperCase().trim();
  if (DUMMY_VENDOR_GSTINS.has(gstin)) return true;
  const email = String(vendor.email || '').toLowerCase().trim();
  if (
    email.includes('pacificprecision.in') ||
    email.includes('hettich.in') ||
    email.includes('hindalco') ||
    email.includes('technopolymers')
  ) {
    return true;
  }
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

// ─── Database ↔ Domain Mappers ─────────────────────────────
function mapDbToItem(row: any): HardwareInventoryItem {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    material: row.material as HardwareInventoryMaterial,
    color: row.color || 'Standard',
    unit: row.unit || "No's",
    hsnCode: row.hsn_code || '8302',
    warehouse: row.warehouse || 'DELHI',
    vendorId: row.vendor_id || undefined,
    vendorName: row.vendor_name || undefined,
    openingStock: Number(row.opening_stock) || 0,
    currentStock: Number(row.current_stock) || 0,
    totalInward: Number(row.total_inward) || 0,
    totalIssued: Number(row.total_issued) || 0,
    reorderLevel: Number(row.reorder_level) || 10,
    unitCost: Number(row.unit_cost) || 0,
    locationRack: row.location_rack || undefined,
    dia: row.dia || undefined,
    length: row.length || undefined,
    width: row.width || undefined,
    imageUrl: row.image_url || undefined,
    status: (row.status as any) || 'ACTIVE',
    notes: row.notes || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

function mapItemToDb(item: HardwareInventoryItem): any {
  return {
    id: item.id,
    sku: item.sku,
    name: item.name,
    category: 'Cubicle Hardware',
    material: item.material,
    color: item.color,
    unit: item.unit,
    hsn_code: item.hsnCode,
    warehouse: item.warehouse,
    vendor_id: item.vendorId || null,
    vendor_name: item.vendorName || null,
    opening_stock: item.openingStock,
    current_stock: item.currentStock,
    total_inward: item.totalInward,
    total_issued: item.totalIssued,
    reorder_level: item.reorderLevel,
    unit_cost: item.unitCost,
    location_rack: item.locationRack || null,
    dia: item.dia || null,
    length: item.length || null,
    width: item.width || null,
    image_url: item.imageUrl || null,
    status: item.status,
    notes: item.notes || null,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

function mapDbToMovement(row: any): HardwareStockMovement {
  return {
    id: row.id,
    movementNumber: row.movement_number,
    hardwareItemId: row.hardware_item_id,
    sku: row.sku,
    hardwareName: row.hardware_name || row.item_name || '',
    material: row.material || 'STAINLESS_STEEL',
    warehouse: row.warehouse || 'DELHI',
    movementType: row.movement_type as HardwareMovementType,
    movementDate: (row.movement_date ? String(row.movement_date).slice(0, 10) : new Date().toISOString().slice(0, 10)),
    quantity: Number(row.quantity) || 0,
    stockBefore: Number(row.stock_before) || 0,
    stockAfter: Number(row.stock_after) || 0,
    unit: row.unit || "No's",
    dia: row.dia || undefined,
    length: row.length || undefined,
    width: row.width || undefined,
    supplierInvoiceNo: row.supplier_invoice_no || undefined,
    supplierInvoiceDate: row.supplier_invoice_date ? String(row.supplier_invoice_date).slice(0, 10) : undefined,
    batchLotNo: row.batch_lot_no || undefined,
    unitCost: Number(row.unit_cost) || 0,
    totalValue: Number(row.total_value || row.total_valuation) || 0,
    issueReference: row.issue_reference || row.work_order_ref || undefined,
    issuedToPerson: row.issued_to_person || undefined,
    notes: row.notes || undefined,
    createdById: row.created_by_id || undefined,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

function mapMovementToDb(mov: HardwareStockMovement): any {
  return {
    id: mov.id,
    movement_number: mov.movementNumber,
    hardware_item_id: mov.hardwareItemId,
    sku: mov.sku,
    item_name: mov.hardwareName,
    hardware_name: mov.hardwareName,
    warehouse: mov.warehouse,
    movement_type: mov.movementType,
    movement_date: mov.movementDate,
    quantity: mov.quantity,
    stock_before: mov.stockBefore,
    stock_after: mov.stockAfter,
    unit: mov.unit,
    unit_cost: mov.unitCost || 0,
    total_value: mov.totalValue || 0,
    total_valuation: mov.totalValue || 0,
    dia: mov.dia || null,
    length: mov.length || null,
    width: mov.width || null,
    issue_reference: mov.issueReference || null,
    work_order_ref: mov.issueReference || null,
    issued_to_person: mov.issuedToPerson || null,
    supplier_invoice_no: mov.supplierInvoiceNo || null,
    supplier_invoice_date: mov.supplierInvoiceDate || null,
    batch_lot_no: mov.batchLotNo || null,
    notes: mov.notes || null,
    created_by_id: mov.createdById || null,
    created_at: mov.createdAt,
  };
}

function mapDbToBranch(row: any): HardwareBranch {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    city: row.city,
    state: row.state,
    address: row.address || undefined,
    phone: row.phone || undefined,
    contactPerson: row.contact_person || undefined,
    isDefault: Boolean(row.is_default),
    isActive: Boolean(row.is_active),
    createdAt: row.created_at || new Date().toISOString(),
  };
}

function mapBranchToDb(branch: HardwareBranch): any {
  return {
    id: branch.id,
    code: branch.code,
    name: branch.name,
    city: branch.city,
    state: branch.state,
    address: branch.address || null,
    phone: branch.phone || null,
    contact_person: branch.contactPerson || null,
    is_default: branch.isDefault || false,
    is_active: branch.isActive !== false,
    created_at: branch.createdAt || new Date().toISOString(),
  };
}

function mapDbToVendor(row: any): HardwareVendor {
  return {
    id: row.id,
    name: row.name,
    legalName: row.legal_name || row.name,
    contactPerson: row.contact_person || undefined,
    phone: row.phone || '',
    email: row.email || undefined,
    gstin: row.gstin || undefined,
    city: row.city || undefined,
    address: row.address || undefined,
    materialCategories: Array.isArray(row.materials_supplied)
      ? row.materials_supplied
      : Array.isArray(row.material_categories)
      ? row.material_categories
      : ['STAINLESS_STEEL'],
    totalSkus: Number(row.total_skus) || 0,
    isActive: Boolean(row.is_active !== false && row.status !== 'INACTIVE'),
    createdAt: row.created_at || new Date().toISOString(),
  };
}

function mapVendorToDb(vendor: HardwareVendor): any {
  return {
    id: vendor.id,
    name: vendor.name,
    legal_name: vendor.legalName || vendor.name,
    contact_person: vendor.contactPerson || null,
    phone: vendor.phone,
    email: vendor.email || null,
    gstin: vendor.gstin || null,
    city: vendor.city || null,
    address: vendor.address || null,
    materials_supplied: vendor.materialCategories || ['STAINLESS_STEEL'],
    material_categories: vendor.materialCategories || ['STAINLESS_STEEL'],
    total_skus: vendor.totalSkus || 0,
    status: vendor.isActive ? 'ACTIVE' : 'INACTIVE',
    is_active: vendor.isActive,
    created_at: vendor.createdAt || new Date().toISOString(),
  };
}

// ── Database Synchronized Store with Superfast Session Cache ──
class HardwareStore {
  private hasSynced = false;
  private syncPromise: Promise<void> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        LEGACY_STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
      } catch (e) {
        console.warn('[HardwareStore] Failed to purge legacy keys:', e);
      }
      // Start background sync on construct
      this.ensureSynced().catch((err) =>
        console.warn('[HardwareStore] Initial DB sync notice:', err)
      );
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

  async ensureSynced(): Promise<void> {
    if (this.hasSynced) return;
    if (this.syncPromise) return this.syncPromise;

    this.syncPromise = (async () => {
      try {
        const [itemsRes, movRes, brRes, vendRes] = await Promise.allSettled([
          supabase.from('hardware_inventory_items').select('*'),
          supabase.from('hardware_stock_movements').select('*').order('created_at', { ascending: false }),
          supabase.from('hardware_branches').select('*'),
          supabase.from('hardware_vendors').select('*'),
        ]);

        // Process Items
        if (itemsRes.status === 'fulfilled' && !itemsRes.value.error && Array.isArray(itemsRes.value.data)) {
          const dbItems = itemsRes.value.data.map(mapDbToItem).filter((i) => !isDummyHardwareItem(i));
          const localItems = this.getStorage<HardwareInventoryItem[]>(ITEMS_STORAGE_KEY, []).filter((i) => !isDummyHardwareItem(i));

          const dbItemIds = new Set(dbItems.map((i) => i.id));
          const dbSkus = new Set(dbItems.map((i) => (i.sku || '').toUpperCase()));
          const unsyncedItems = localItems.filter(
            (i) => !dbItemIds.has(i.id) && !dbSkus.has((i.sku || '').toUpperCase())
          );
          if (unsyncedItems.length > 0) {
            for (const item of unsyncedItems) {
              try {
                await supabase.from('hardware_inventory_items').upsert(mapItemToDb(item), { onConflict: 'sku' });
                dbItems.unshift(item);
              } catch (upsertErr) {
                console.warn('[HardwareStore] Sync item notice:', upsertErr);
              }
            }
          }

          this.setStorage(ITEMS_STORAGE_KEY, dbItems);
        }

        // Process Movements
        if (movRes.status === 'fulfilled' && !movRes.value.error && Array.isArray(movRes.value.data)) {
          const dbMovs = movRes.value.data.map(mapDbToMovement);
          const localMovs = this.getStorage<HardwareStockMovement[]>(MOVEMENTS_STORAGE_KEY, []);

          const dbMovIds = new Set(dbMovs.map((m) => m.id));
          const dbMovNums = new Set(dbMovs.map((m) => m.movementNumber));
          const unsyncedMovs = localMovs.filter(
            (m) => !dbMovIds.has(m.id) && !dbMovNums.has(m.movementNumber)
          );
          if (unsyncedMovs.length > 0) {
            for (const mov of unsyncedMovs) {
              try {
                await supabase.from('hardware_stock_movements').upsert(mapMovementToDb(mov), { onConflict: 'movement_number' });
                dbMovs.unshift(mov);
              } catch (upsertErr) {
                console.warn('[HardwareStore] Sync movement notice:', upsertErr);
              }
            }
          }

          this.setStorage(MOVEMENTS_STORAGE_KEY, dbMovs);
        }

        // Process Branches
        if (brRes.status === 'fulfilled' && !brRes.value.error && Array.isArray(brRes.value.data) && brRes.value.data.length > 0) {
          const dbBranches = brRes.value.data.map(mapDbToBranch);
          this.setStorage(BRANCHES_STORAGE_KEY, dbBranches);
        }

        // Process Vendors
        if (vendRes.status === 'fulfilled' && !vendRes.value.error && Array.isArray(vendRes.value.data)) {
          const dbVendors = vendRes.value.data.map(mapDbToVendor).filter((v) => !isDummyHardwareVendor(v));
          const localVendors = this.getStorage<HardwareVendor[]>(VENDORS_STORAGE_KEY, []).filter((v) => !isDummyHardwareVendor(v));

          const dbVendorIds = new Set(dbVendors.map((v) => v.id));
          const unsyncedVendors = localVendors.filter((v) => !dbVendorIds.has(v.id));
          if (unsyncedVendors.length > 0) {
            for (const vendor of unsyncedVendors) {
              await supabase.from('hardware_vendors').upsert(mapVendorToDb(vendor), { onConflict: 'id' });
              dbVendors.unshift(vendor);
            }
          }

          this.setStorage(VENDORS_STORAGE_KEY, dbVendors);
        }

        this.hasSynced = true;
      } catch (err) {
        console.warn('[HardwareStore] Database sync error:', err);
      } finally {
        this.syncPromise = null;
      }
    })();

    return this.syncPromise;
  }

  getItems(): HardwareInventoryItem[] {
    const raw = this.getStorage<HardwareInventoryItem[]>(ITEMS_STORAGE_KEY, []);
    const clean = raw.filter((i) => !isDummyHardwareItem(i));
    if (clean.length !== raw.length) {
      this.setStorage(ITEMS_STORAGE_KEY, clean);
    }
    return clean;
  }

  saveItems(items: HardwareInventoryItem[]): void {
    const clean = items.filter((i) => !isDummyHardwareItem(i));
    this.setStorage(ITEMS_STORAGE_KEY, clean);
  }

  async persistItem(item: HardwareInventoryItem): Promise<void> {
    try {
      await supabase.from('hardware_inventory_items').upsert(mapItemToDb(item), { onConflict: 'sku' });
    } catch (err) {
      console.warn('[HardwareStore] Failed to upsert item to DB:', err);
    }
  }

  async deleteItem(id: string): Promise<void> {
    try {
      await supabase.from('hardware_inventory_items').delete().eq('id', id);
    } catch (err) {
      console.warn('[HardwareStore] Failed to delete item from DB:', err);
    }
  }

  getMovements(): HardwareStockMovement[] {
    const raw = this.getStorage<HardwareStockMovement[]>(MOVEMENTS_STORAGE_KEY, []);
    const clean = raw.filter((m) => {
      if (m.hardwareItemId && m.hardwareItemId.startsWith('hw-item-')) return false;
      if (m.sku && DUMMY_HARDWARE_SKUS.has(m.sku.toUpperCase())) return false;
      return true;
    });
    if (clean.length !== raw.length) {
      this.setStorage(MOVEMENTS_STORAGE_KEY, clean);
    }
    return clean;
  }

  saveMovements(movements: HardwareStockMovement[]): void {
    this.setStorage(MOVEMENTS_STORAGE_KEY, movements);
  }

  async persistMovement(movement: HardwareStockMovement): Promise<void> {
    try {
      await supabase.from('hardware_stock_movements').upsert(mapMovementToDb(movement), { onConflict: 'movement_number' });
    } catch (err) {
      console.warn('[HardwareStore] Failed to upsert movement to DB:', err);
    }
  }

  getBranches(): HardwareBranch[] {
    return this.getStorage<HardwareBranch[]>(BRANCHES_STORAGE_KEY, DEFAULT_HARDWARE_BRANCHES);
  }

  saveBranches(branches: HardwareBranch[]): void {
    this.setStorage(BRANCHES_STORAGE_KEY, branches);
  }

  async persistBranch(branch: HardwareBranch): Promise<void> {
    try {
      await supabase.from('hardware_branches').upsert(mapBranchToDb(branch), { onConflict: 'id' });
    } catch (err) {
      console.warn('[HardwareStore] Failed to upsert branch to DB:', err);
    }
  }

  getVendors(): HardwareVendor[] {
    const raw = this.getStorage<HardwareVendor[]>(VENDORS_STORAGE_KEY, []);
    const clean = raw.filter((v) => !isDummyHardwareVendor(v));
    if (clean.length !== raw.length) {
      this.setStorage(VENDORS_STORAGE_KEY, clean);
    }
    return clean;
  }

  saveVendors(vendors: HardwareVendor[]): void {
    const clean = vendors.filter((v) => !isDummyHardwareVendor(v));
    this.setStorage(VENDORS_STORAGE_KEY, clean);
  }

  async persistVendor(vendor: HardwareVendor): Promise<void> {
    try {
      await supabase.from('hardware_vendors').upsert(mapVendorToDb(vendor), { onConflict: 'id' });
    } catch (err) {
      console.warn('[HardwareStore] Failed to upsert vendor to DB:', err);
    }
  }

  async deleteVendor(id: string): Promise<void> {
    try {
      await supabase.from('hardware_vendors').delete().eq('id', id);
    } catch (err) {
      console.warn('[HardwareStore] Failed to delete vendor from DB:', err);
    }
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
    dia?: string;
    length?: string;
    width?: string;
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
    } catch {}

    // Ensure data is synced from database
    await store.ensureSynced();

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
    if (params?.dia && params.dia !== 'ALL') {
      items = items.filter((i) => i.dia && i.dia.toLowerCase() === params.dia!.toLowerCase());
    }
    if (params?.length && params.length !== 'ALL') {
      items = items.filter((i) => i.length && i.length.toLowerCase() === params.length!.toLowerCase());
    }
    if (params?.width && params.width !== 'ALL') {
      items = items.filter((i) => i.width && i.width.toLowerCase() === params.width!.toLowerCase());
    }
    if (params?.search && params.search.trim()) {
      const q = params.search.toLowerCase().trim();
      items = items.filter(
        (i) =>
          i.sku.toLowerCase().includes(q) ||
          i.name.toLowerCase().includes(q) ||
          (i.hsnCode && i.hsnCode.includes(q)) ||
          (i.vendorName && i.vendorName.toLowerCase().includes(q)) ||
          (i.locationRack && i.locationRack.toLowerCase().includes(q)) ||
          (i.dia && i.dia.toLowerCase().includes(q)) ||
          (i.length && i.length.toLowerCase().includes(q)) ||
          (i.width && i.width.toLowerCase().includes(q))
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

    await store.ensureSynced();
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
      dia: data.dia?.trim() || undefined,
      length: data.length?.trim() || undefined,
      width: data.width?.trim() || undefined,
      imageUrl: data.imageUrl?.trim() || undefined,
      status: initialStatus,
      notes: data.notes?.trim() || '',
      createdAt: now,
      updatedAt: now,
    };

    items.unshift(newItem);
    store.saveItems(items);
    store.persistItem(newItem);

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
        dia: newItem.dia,
        length: newItem.length,
        width: newItem.width,
        unitCost,
        totalValue: openingStock * unitCost,
        notes: 'Initial opening stock registration',
        createdAt: now,
      };
      movements.unshift(initialMovement);
      store.saveMovements(movements);
      store.persistMovement(initialMovement);
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
      dia: data.dia !== undefined ? (data.dia.trim() || undefined) : current.dia,
      length: data.length !== undefined ? (data.length.trim() || undefined) : current.length,
      width: data.width !== undefined ? (data.width.trim() || undefined) : current.width,
      imageUrl: data.imageUrl !== undefined ? (data.imageUrl.trim() || undefined) : current.imageUrl,
      status: (data.status as any) || current.status,
      notes: data.notes !== undefined ? data.notes.trim() : current.notes,
      updatedAt: new Date().toISOString(),
    };

    items[index] = updated;
    store.saveItems(items);
    store.persistItem(updated);

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
    store.deleteItem(id);

    return {
      data: {
        success: true,
        data: { success: true },
      },
    };
  },

  getDistinctDimensions: async (): Promise<{
    data: ApiResponse<{
      dias: string[];
      lengths: string[];
      widths: string[];
    }>;
  }> => {
    await store.ensureSynced();
    const items = store.getItems();
    const dias = Array.from(new Set(items.map((i) => i.dia?.trim()).filter(Boolean) as string[])).sort();
    const lengths = Array.from(new Set(items.map((i) => i.length?.trim()).filter(Boolean) as string[])).sort();
    const widths = Array.from(new Set(items.map((i) => i.width?.trim()).filter(Boolean) as string[])).sort();
    return {
      data: {
        success: true,
        data: { dias, lengths, widths },
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
      dia: item.dia,
      length: item.length,
      width: item.width,
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
    store.persistItem(updatedItem);

    const movements = store.getMovements();
    movements.unshift(movement);
    store.saveMovements(movements);
    store.persistMovement(movement);

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
      dia: item.dia,
      length: item.length,
      width: item.width,
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
    store.persistItem(updatedItem);

    const movements = store.getMovements();
    movements.unshift(movement);
    store.saveMovements(movements);
    store.persistMovement(movement);

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
    store.persistItem(updatedItem);

    const movements = store.getMovements();
    movements.unshift(movement);
    store.saveMovements(movements);
    store.persistMovement(movement);

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
    await store.ensureSynced();
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

  // ── Dedicated Stock Issue History (All SKUs or filtered) ──
  getIssueHistory: async (params?: {
    hardwareItemId?: string;
    sku?: string;
    warehouse?: string;
    material?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<{
    data: ApiResponse<{
      issues: HardwareStockMovement[];
      totalUnitsIssued: number;
      totalIssueValuation: number;
      totalTransactions: number;
      uniqueSkusCount: number;
    }>;
  }> => {
    await store.ensureSynced();
    let movements = store.getMovements().filter((m) => m.movementType === 'ISSUE');

    if (params?.hardwareItemId && params.hardwareItemId !== 'ALL') {
      movements = movements.filter((m) => m.hardwareItemId === params.hardwareItemId);
    }
    if (params?.sku && params.sku !== 'ALL') {
      movements = movements.filter((m) => m.sku.toUpperCase() === params.sku!.toUpperCase());
    }
    if (params?.warehouse && params.warehouse !== 'ALL') {
      movements = movements.filter((m) => m.warehouse.toUpperCase() === params.warehouse!.toUpperCase());
    }
    if (params?.material && params.material !== 'ALL') {
      movements = movements.filter((m) => m.material.toUpperCase() === params.material!.toUpperCase());
    }
    if (params?.startDate) {
      movements = movements.filter((m) => m.movementDate >= params.startDate!);
    }
    if (params?.endDate) {
      movements = movements.filter((m) => m.movementDate <= params.endDate!);
    }
    if (params?.search && params.search.trim()) {
      const q = params.search.toLowerCase().trim();
      movements = movements.filter(
        (m) =>
          m.sku.toLowerCase().includes(q) ||
          m.hardwareName.toLowerCase().includes(q) ||
          m.movementNumber.toLowerCase().includes(q) ||
          (m.issueReference && m.issueReference.toLowerCase().includes(q)) ||
          (m.issuedToPerson && m.issuedToPerson.toLowerCase().includes(q)) ||
          (m.notes && m.notes.toLowerCase().includes(q))
      );
    }

    const totalTransactions = movements.length;
    const totalUnitsIssued = movements.reduce((acc, m) => acc + (Number(m.quantity) || 0), 0);
    const totalIssueValuation = movements.reduce((acc, m) => acc + (Number(m.totalValue) || 0), 0);
    const uniqueSkusCount = new Set(movements.map((m) => m.sku)).size;

    if (params?.limit) {
      movements = movements.slice(0, params.limit);
    }

    return {
      data: {
        success: true,
        data: {
          issues: movements,
          totalUnitsIssued,
          totalIssueValuation,
          totalTransactions,
          uniqueSkusCount,
        },
      },
    };
  },

  // ── Analytics & Live Metrics ──────────────────────────────
  getAnalytics: async (params?: {
    warehouse?: string;
  }): Promise<{ data: ApiResponse<HardwareAnalyticsSummary> }> => {
    await store.ensureSynced();
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
    await store.ensureSynced();
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
    store.persistBranch(newBranch);

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
    store.persistBranch(branches[idx]);

    return {
      data: {
        success: true,
        data: branches[idx],
      },
    };
  },

  // ── Hardware Vendor Management ────────────────────────────
  listVendors: async (): Promise<{ data: ApiResponse<HardwareVendor[]> }> => {
    await store.ensureSynced();
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
    store.persistVendor(newVendor);

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
    store.persistVendor(vendors[idx]);

    return {
      data: {
        success: true,
        data: vendors[idx],
      },
    };
  },

  deleteVendor: async (id: string): Promise<{ data: ApiResponse<{ success: boolean }> }> => {
    try {
      const res = await apiClient.delete<ApiResponse<{ success: boolean }>>(`/inventory/hardware/vendors/${id}`);
      if (res.data?.success) return { data: res.data };
    } catch {}

    let vendors = store.getVendors();
    vendors = vendors.filter((v) => v.id !== id);
    store.saveVendors(vendors);
    store.deleteVendor(id);

    return {
      data: {
        success: true,
        data: { success: true },
      },
    };
  },

  clearAllVendors: async (): Promise<{ data: ApiResponse<{ success: boolean }> }> => {
    store.saveVendors([]);
    try {
      await supabase.from('hardware_vendors').delete().neq('id', '');
    } catch {}
    return {
      data: {
        success: true,
        data: { success: true },
      },
    };
  },

  // ── Maintenance & Clean-Slate Helpers ─────────────────────
  clearAllItems: async (): Promise<{ data: ApiResponse<{ success: boolean }> }> => {
    store.saveItems([]);
    store.saveMovements([]);
    try {
      await supabase.from('hardware_stock_movements').delete().neq('id', '');
      await supabase.from('hardware_inventory_items').delete().neq('id', '');
    } catch {}
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
