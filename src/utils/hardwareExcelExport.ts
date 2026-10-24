/**
 * Pacific Enterprise Hardware Inventory Excel Export Engine
 * Generates audit-grade, multi-tab Microsoft Excel (.xlsx) workbooks for
 * hardware inventory registers, stock movement ledgers, valuation summaries,
 * replenishment alerts, and vendor directories.
 * Supports granular filter-wise exports (by branch, material, finish, status, vendor, search query).
 */

import * as XLSX from 'xlsx';
import type {
  HardwareInventoryItem,
  HardwareBranch,
  HardwareVendor,
  HardwareStockMovement,
  HardwareAnalyticsSummary,
} from '../types/admin';

export interface ActiveHardwareFilters {
  branch?: string;
  material?: string;
  color?: string;
  unit?: string;
  vendorId?: string;
  vendorName?: string;
  status?: string;
  search?: string;
  dia?: string;
  length?: string;
  width?: string;
}

export interface ExportHardwareExcelOptions {
  items: HardwareInventoryItem[];
  branches: HardwareBranch[];
  vendors?: HardwareVendor[];
  movements?: HardwareStockMovement[];
  analytics?: HardwareAnalyticsSummary | null;
  selectedBranch?: string;
  activeFilters?: ActiveHardwareFilters;
  customFilename?: string;
}

/**
 * Format material category label for clean presentation
 */
function formatMaterial(mat: string): string {
  switch (mat) {
    case 'STAINLESS_STEEL':
      return 'Stainless Steel (SS)';
    case 'ALUMINIUM':
      return 'Aluminium';
    case 'NYLON':
      return 'Nylon';
    default:
      return mat || 'Standard';
  }
}

/**
 * Build a concise label describing all active filters
 */
function buildFilterDescription(filters?: ActiveHardwareFilters, branch = 'ALL'): string {
  const parts: string[] = [];
  const b = filters?.branch || branch;
  if (b && b !== 'ALL') parts.push(`Branch: ${b}`);
  if (filters?.material && filters.material !== 'ALL') parts.push(`Material: ${formatMaterial(filters.material)}`);
  if (filters?.color && filters.color !== 'ALL') parts.push(`Color: ${filters.color}`);
  if (filters?.unit && filters.unit !== 'ALL') parts.push(`Unit: ${filters.unit}`);
  if (filters?.vendorName && filters.vendorName !== 'ALL') parts.push(`Vendor: ${filters.vendorName}`);
  if (filters?.status && filters.status !== 'ALL') parts.push(`Status: ${filters.status}`);
  if (filters?.dia && filters.dia !== 'ALL') parts.push(`Dia: ${filters.dia}`);
  if (filters?.length && filters.length !== 'ALL') parts.push(`Length: ${filters.length}`);
  if (filters?.width && filters.width !== 'ALL') parts.push(`Width: ${filters.width}`);
  if (filters?.search && filters.search.trim()) parts.push(`Search: "${filters.search.trim()}"`);

  return parts.length > 0 ? parts.join(' | ') : 'All Consolidated Records (Unfiltered)';
}

/**
 * Exports a full, executive multi-sheet Hardware Inventory workbook (.xlsx)
 * with complete support for filter-wise generation.
 */
export function exportComprehensiveHardwareReport({
  items,
  branches,
  vendors = [],
  movements = [],
  analytics = null,
  selectedBranch = 'ALL',
  activeFilters,
  customFilename,
}: ExportHardwareExcelOptions): void {
  const wb = XLSX.utils.book_new();
  const dateStr = new Date().toISOString().split('T')[0];

  // 1. Resolve filtered items
  let targetItems = [...items];
  if (activeFilters) {
    if (activeFilters.branch && activeFilters.branch !== 'ALL') {
      targetItems = targetItems.filter(
        (i) => (i.warehouse || '').toUpperCase() === activeFilters.branch!.toUpperCase()
      );
    }
    if (activeFilters.material && activeFilters.material !== 'ALL') {
      targetItems = targetItems.filter(
        (i) => (i.material || '').toUpperCase() === activeFilters.material!.toUpperCase()
      );
    }
    if (activeFilters.color && activeFilters.color !== 'ALL') {
      targetItems = targetItems.filter(
        (i) => (i.color || '').toLowerCase() === activeFilters.color!.toLowerCase()
      );
    }
    if (activeFilters.unit && activeFilters.unit !== 'ALL') {
      targetItems = targetItems.filter(
        (i) => (i.unit || '').toLowerCase() === activeFilters.unit!.toLowerCase()
      );
    }
    if (activeFilters.vendorId && activeFilters.vendorId !== 'ALL') {
      targetItems = targetItems.filter((i) => i.vendorId === activeFilters.vendorId);
    }
    if (activeFilters.status && activeFilters.status !== 'ALL') {
      targetItems = targetItems.filter((i) => {
        const itemStatus =
          i.status ||
          (i.currentStock <= 0
            ? 'OUT_OF_STOCK'
            : i.currentStock <= i.reorderLevel
            ? 'LOW_STOCK'
            : 'ACTIVE');
        return itemStatus === activeFilters.status;
      });
    }
    if (activeFilters.dia && activeFilters.dia !== 'ALL') {
      targetItems = targetItems.filter((i) => i.dia === activeFilters.dia);
    }
    if (activeFilters.length && activeFilters.length !== 'ALL') {
      targetItems = targetItems.filter((i) => i.length === activeFilters.length);
    }
    if (activeFilters.width && activeFilters.width !== 'ALL') {
      targetItems = targetItems.filter((i) => i.width === activeFilters.width);
    }
    if (activeFilters.search && activeFilters.search.trim()) {
      const q = activeFilters.search.toLowerCase().trim();
      targetItems = targetItems.filter(
        (i) =>
          (i.sku || '').toLowerCase().includes(q) ||
          (i.name || '').toLowerCase().includes(q) ||
          (i.vendorName || '').toLowerCase().includes(q) ||
          (i.hsnCode || '').toLowerCase().includes(q)
      );
    }
  } else if (selectedBranch && selectedBranch !== 'ALL') {
    targetItems = targetItems.filter(
      (i) => (i.warehouse || '').toUpperCase() === selectedBranch.toUpperCase()
    );
  }

  const effectiveBranch = activeFilters?.branch || selectedBranch || 'ALL';
  const filterDesc = buildFilterDescription(activeFilters, selectedBranch);
  const isFiltered = activeFilters ? Object.values(activeFilters).some((v) => v && v !== 'ALL') : (selectedBranch !== 'ALL');

  // ──────────────────────────────────────────────────────────
  // Sheet 1: Hardware Master Register
  // ──────────────────────────────────────────────────────────
  const masterData = targetItems.map((item, idx) => ({
    'Sl No': idx + 1,
    'SKU': item.sku,
    'Item Name': item.name,
    'Material': formatMaterial(item.material),
    'Color / Finish': item.color || 'Standard',
    'Warehouse / Branch': item.warehouse,
    'Rack Location': item.locationRack || '—',
    'HSN Code': item.hsnCode || '8302',
    'Preferred Vendor': item.vendorName || '—',
    'Unit of Measure': item.unit || "No's",
    'Dimensions (Dia)': item.dia || '—',
    'Dimensions (L)': item.length || '—',
    'Dimensions (W)': item.width || '—',
    'Opening Stock': Number(item.openingStock) || 0,
    'Total Inward': Number(item.totalInward) || 0,
    'Total Issued': Number(item.totalIssued) || 0,
    'Current Stock': Number(item.currentStock) || 0,
    'Reorder Level': Number(item.reorderLevel) || 10,
    'Unit Purchase Cost (INR)': Number(item.unitCost) || 0,
    'Total Valuation (INR)': (Number(item.currentStock) || 0) * (Number(item.unitCost) || 0),
    'Stock Status':
      item.status ||
      (item.currentStock <= 0
        ? 'OUT_OF_STOCK'
        : item.currentStock <= item.reorderLevel
        ? 'LOW_STOCK'
        : 'ACTIVE'),
    'Notes / Remarks': item.notes || '—',
    'Created Date': item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN') : '—',
  }));

  const wsMaster = XLSX.utils.json_to_sheet(masterData);
  wsMaster['!cols'] = [
    { wch: 6 },  // Sl No
    { wch: 18 }, // SKU
    { wch: 32 }, // Item Name
    { wch: 22 }, // Material
    { wch: 16 }, // Color / Finish
    { wch: 18 }, // Warehouse
    { wch: 14 }, // Rack
    { wch: 12 }, // HSN
    { wch: 26 }, // Vendor
    { wch: 15 }, // Unit
    { wch: 16 }, // Dia
    { wch: 16 }, // Length
    { wch: 16 }, // Width
    { wch: 14 }, // Opening
    { wch: 14 }, // Inward
    { wch: 14 }, // Issued
    { wch: 14 }, // Closing
    { wch: 14 }, // Reorder
    { wch: 22 }, // Unit Cost
    { wch: 22 }, // Total Value
    { wch: 16 }, // Status
    { wch: 30 }, // Notes
    { wch: 14 }, // Created
  ];
  XLSX.utils.book_append_sheet(wb, wsMaster, 'Hardware Master Register');

  // ──────────────────────────────────────────────────────────
  // Sheet 2: Stock Movement Ledger (Audit Trail)
  // ──────────────────────────────────────────────────────────
  if (movements && movements.length > 0) {
    let targetMovements = [...movements];
    if (effectiveBranch !== 'ALL') {
      targetMovements = targetMovements.filter(
        (m) => (m.warehouse || '').toUpperCase() === effectiveBranch.toUpperCase()
      );
    }
    if (activeFilters?.material && activeFilters.material !== 'ALL') {
      targetMovements = targetMovements.filter(
        (m) => (m.material || '').toUpperCase() === activeFilters.material!.toUpperCase()
      );
    }
    if (activeFilters?.search && activeFilters.search.trim()) {
      const q = activeFilters.search.toLowerCase().trim();
      targetMovements = targetMovements.filter(
        (m) =>
          (m.sku || '').toLowerCase().includes(q) ||
          (m.hardwareName || '').toLowerCase().includes(q) ||
          (m.movementNumber || '').toLowerCase().includes(q)
      );
    }

    const movementsData = targetMovements.map((mov, idx) => ({
      'Sl No': idx + 1,
      'Movement Date': mov.movementDate ? new Date(mov.movementDate).toLocaleDateString('en-IN') : '—',
      'Movement Number': mov.movementNumber,
      'Action Type': mov.movementType,
      'SKU': mov.sku,
      'Hardware Name': mov.hardwareName,
      'Material': formatMaterial(mov.material),
      'Warehouse / Branch': mov.warehouse,
      'Quantity': mov.movementType === 'INWARD' ? `+${mov.quantity}` : `-${mov.quantity}`,
      'Stock Before': mov.stockBefore,
      'Stock After': mov.stockAfter,
      'Unit of Measure': mov.unit || "No's",
      'Unit Cost (INR)': Number(mov.unitCost) || 0,
      'Movement Valuation (INR)': Number(mov.totalValue) || 0,
      'Invoice / Ref No': mov.supplierInvoiceNo || mov.issueReference || '—',
      'Invoice Date': mov.supplierInvoiceDate ? new Date(mov.supplierInvoiceDate).toLocaleDateString('en-IN') : '—',
      'Handled By / Operator': mov.issuedToPerson || '—',
      'Batch / Lot No': mov.batchLotNo || '—',
      'Remarks': mov.notes || '—',
    }));

    const wsMovements = XLSX.utils.json_to_sheet(movementsData);
    wsMovements['!cols'] = [
      { wch: 6 },  // Sl No
      { wch: 14 }, // Date
      { wch: 22 }, // Movement No
      { wch: 14 }, // Type
      { wch: 18 }, // SKU
      { wch: 28 }, // Hardware Name
      { wch: 22 }, // Material
      { wch: 18 }, // Warehouse
      { wch: 12 }, // Quantity
      { wch: 14 }, // Stock Before
      { wch: 14 }, // Stock After
      { wch: 12 }, // Unit
      { wch: 16 }, // Unit Cost
      { wch: 22 }, // Valuation
      { wch: 22 }, // Ref No
      { wch: 14 }, // Invoice Date
      { wch: 22 }, // Handled By
      { wch: 16 }, // Batch
      { wch: 30 }, // Remarks
    ];
    XLSX.utils.book_append_sheet(wb, wsMovements, 'Stock Movement Ledger');
  }

  // ──────────────────────────────────────────────────────────
  // Sheet 3: Low Stock & Reorder Alerts
  // ──────────────────────────────────────────────────────────
  const lowStockItems = targetItems.filter((i) => i.currentStock <= i.reorderLevel);
  const lowStockData = lowStockItems.map((item, idx) => {
    const deficit = Math.max(0, (item.reorderLevel || 10) - (item.currentStock || 0));
    const estimatedCost = deficit * (Number(item.unitCost) || 0);
    return {
      'Sl No': idx + 1,
      'SKU': item.sku,
      'Item Name': item.name,
      'Material': formatMaterial(item.material),
      'Color / Finish': item.color || 'Standard',
      'Warehouse / Branch': item.warehouse,
      'Current Stock': `${item.currentStock} ${item.unit || "No's"}`,
      'Safety Reorder Level': `${item.reorderLevel} ${item.unit || "No's"}`,
      'Deficit to Restock': `${deficit} ${item.unit || "No's"}`,
      'Unit Purchase Cost (INR)': Number(item.unitCost) || 0,
      'Estimated Restock Cost (INR)': estimatedCost,
      'Primary Vendor': item.vendorName || '—',
      'Urgency Status': item.currentStock <= 0 ? 'CRITICAL - OUT OF STOCK' : 'WARNING - LOW STOCK',
      'Rack Location': item.locationRack || '—',
    };
  });

  const wsLowStock = XLSX.utils.json_to_sheet(
    lowStockData.length > 0
      ? lowStockData
      : [{ 'Status': 'All hardware items in this selection are adequately stocked' }]
  );
  wsLowStock['!cols'] = [
    { wch: 6 },  // Sl No
    { wch: 18 }, // SKU
    { wch: 32 }, // Item Name
    { wch: 22 }, // Material
    { wch: 16 }, // Color
    { wch: 18 }, // Branch
    { wch: 16 }, // Current
    { wch: 20 }, // Reorder
    { wch: 18 }, // Deficit
    { wch: 22 }, // Unit Cost
    { wch: 26 }, // Restock Cost
    { wch: 26 }, // Vendor
    { wch: 28 }, // Status
    { wch: 16 }, // Rack
  ];
  XLSX.utils.book_append_sheet(wb, wsLowStock, 'Low Stock Alerts');

  // ──────────────────────────────────────────────────────────
  // Sheet 4: Executive Valuation & Distribution Summary
  // ──────────────────────────────────────────────────────────
  const totalUnits = targetItems.reduce((acc, i) => acc + (Number(i.currentStock) || 0), 0);
  const totalValuation = targetItems.reduce(
    (acc, i) => acc + (Number(i.currentStock) || 0) * (Number(i.unitCost) || 0),
    0
  );

  // Group by branch
  const branchSummaryMap = new Map<string, { skus: number; units: number; val: number }>();
  // Group by material
  const matSummaryMap = new Map<string, { skus: number; units: number; val: number }>();

  targetItems.forEach((i) => {
    // Branch
    const bKey = (i.warehouse || 'DELHI').toUpperCase();
    const bExisting = branchSummaryMap.get(bKey) || { skus: 0, units: 0, val: 0 };
    bExisting.skus += 1;
    bExisting.units += Number(i.currentStock) || 0;
    bExisting.val += (Number(i.currentStock) || 0) * (Number(i.unitCost) || 0);
    branchSummaryMap.set(bKey, bExisting);

    // Material
    const mKey = formatMaterial(i.material);
    const mExisting = matSummaryMap.get(mKey) || { skus: 0, units: 0, val: 0 };
    mExisting.skus += 1;
    mExisting.units += Number(i.currentStock) || 0;
    mExisting.val += (Number(i.currentStock) || 0) * (Number(i.unitCost) || 0);
    matSummaryMap.set(mKey, mExisting);
  });

  const summaryData = [
    { 'Metric': 'Report Title', 'Value': isFiltered ? 'Pacific Hardware Inventory — Filtered Audit Report' : 'Pacific Hardware Inventory — Consolidated Master Report' },
    { 'Metric': 'Report Timestamp', 'Value': `${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN')}` },
    { 'Metric': 'Active Filter Criteria', 'Value': filterDesc },
    { 'Metric': 'Matching Registered SKUs', 'Value': targetItems.length },
    { 'Metric': 'Total Units in Selection', 'Value': totalUnits },
    { 'Metric': 'Total Selected Valuation (INR)', 'Value': totalValuation },
    { 'Metric': 'Low Stock / Depleted SKUs', 'Value': lowStockItems.length },
    { 'Metric': '', 'Value': '' },
    { 'Metric': '── BRANCH LOCATION BREAKDOWN (IN FILTER) ──', 'Value': '' },
    ...Array.from(branchSummaryMap.entries()).map(([code, d]) => ({
      'Metric': `Branch: ${code}`,
      'Value': `${d.skus} SKUs | ${d.units} Units | ₹${d.val.toLocaleString('en-IN')}`,
    })),
    { 'Metric': '', 'Value': '' },
    { 'Metric': '── MATERIAL BREAKDOWN (IN FILTER) ──', 'Value': '' },
    ...Array.from(matSummaryMap.entries()).map(([mat, d]) => ({
      'Metric': `Material: ${mat}`,
      'Value': `${d.skus} SKUs | ${d.units} Units | ₹${d.val.toLocaleString('en-IN')}`,
    })),
  ];

  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  wsSummary['!cols'] = [
    { wch: 42 },
    { wch: 60 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Inventory Valuation Summary');

  // ──────────────────────────────────────────────────────────
  // Sheet 5: Approved Hardware Vendors Directory
  // ──────────────────────────────────────────────────────────
  if (vendors && vendors.length > 0) {
    const vendorsData = vendors.map((v, idx) => ({
      'Sl No': idx + 1,
      'Vendor ID': v.id,
      'Trade / Commercial Name': v.name,
      'Legal Entity Name': v.legalName || v.name,
      'Contact Person': v.contactPerson || '—',
      'Phone Number': v.phone || '—',
      'Email Address': v.email || '—',
      'GSTIN Number': v.gstin || '—',
      'City / Region': v.city || '—',
      'Full Office Address': v.address || '—',
      'Material Categories Supplied': Array.isArray(v.materialCategories)
        ? v.materialCategories.map(formatMaterial).join(', ')
        : '—',
      'Supplied SKUs in Report': targetItems.filter((i) => i.vendorId === v.id).length,
      'Account Status': v.isActive ? 'ACTIVE' : 'INACTIVE',
    }));

    const wsVendors = XLSX.utils.json_to_sheet(vendorsData);
    wsVendors['!cols'] = [
      { wch: 6 },  // Sl No
      { wch: 18 }, // Vendor ID
      { wch: 30 }, // Trade Name
      { wch: 30 }, // Legal Name
      { wch: 22 }, // Contact Person
      { wch: 18 }, // Phone
      { wch: 26 }, // Email
      { wch: 18 }, // GSTIN
      { wch: 16 }, // City
      { wch: 36 }, // Address
      { wch: 32 }, // Materials
      { wch: 22 }, // SKUs
      { wch: 14 }, // Status
    ];
    XLSX.utils.book_append_sheet(wb, wsVendors, 'Hardware Vendors Directory');
  }

  // Construct intelligent descriptive filename
  let filename = customFilename;
  if (!filename) {
    const tagParts: string[] = ['Pacific_Hardware'];
    if (isFiltered) {
      tagParts.push('Filtered');
      if (effectiveBranch && effectiveBranch !== 'ALL') tagParts.push(effectiveBranch);
      if (activeFilters?.material && activeFilters.material !== 'ALL') tagParts.push(activeFilters.material);
      if (activeFilters?.status && activeFilters.status !== 'ALL') tagParts.push(activeFilters.status);
    } else {
      tagParts.push('Consolidated_Report');
    }
    tagParts.push(dateStr);
    filename = `${tagParts.join('_')}.xlsx`;
  }

  XLSX.writeFile(wb, filename);
}

/**
 * Quick export of single items list
 */
export function exportHardwareItemsList(
  items: HardwareInventoryItem[],
  filename = `Pacific_Hardware_Items_${new Date().toISOString().split('T')[0]}.xlsx`
): void {
  exportComprehensiveHardwareReport({
    items,
    branches: [],
    customFilename: filename,
  });
}
