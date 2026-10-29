import type { ProductCatalogModel, ProductCategoryType } from '../types/admin';

/**
 * Standard Pacific Catalog Models used for Quotations.
 * These ensure the quotation builder always has access to the official Pacific product range
 * with full technical specifications, door dimensions, ground heights, and hardware lists.
 */
export const PACIFIC_STANDARD_QUOTATION_MODELS: ProductCatalogModel[] = [];

/**
 * Returns only active, published models from database / catalog.
 * Hardcoded presets are deleted so only database-listed models appear in Quotations, PI, Orders & Invoices.
 */
export function getMergedQuotationModels(userModels: ProductCatalogModel[] = []): ProductCatalogModel[] {
  return (userModels || []).filter((m) => m.published !== false);
}

/**
 * Formats a model's hardware list into the narrative "Standard Inclusions & Hardware Accessories *" format.
 */
export function formatModelHardwareInclusions(model: ProductCatalogModel): string {
  const lines: string[] = [];

  // Hardware package headline
  if (model.category === 'Lockers') {
    lines.push('• Standard Heavy-Duty Uniform Hardware Package (Tamper-Proof Concealed Installation)');
  } else if (model.category === 'Urinal Partitions') {
    if (model.hasExtraLeg || model.title.toLowerCase().includes('model a')) {
      lines.push('• Mounting System: Wall Clamps + Extra Adjustable Floor Supporting Leg (100–150mm)');
    } else {
      lines.push('• Mounting System: Wall Cantilever Floating Mount (Zero Floor Obstruction)');
    }
  }

  // Itemized components
  if (model.hardwareList && model.hardwareList.length > 0) {
    model.hardwareList.forEach((h) => {
      const cleanName = h.name.replace(/\s*\[SS Hardware\]\s*/gi, ' ').trim();
      const mat =
        h.material && h.material !== 'Standard' && h.material !== 'Both' && h.material !== 'SS Hardware'
          ? ` [${h.material}]`
          : '';
      const cleanNotes = h.notes ? ` (${h.notes.replace(/\s*\[SS Hardware\]\s*/gi, ' ').trim()})` : '';
      lines.push(`• ${cleanName}${mat}${cleanNotes}`);
    });
  } else {
    // Default fallback hardware components by category
    if (model.category === 'Cubicle') {
      lines.push('• Gravity Hinges: Self-closing gravity hinges with nylon cam mechanism');
      lines.push('• Occupancy Indicator Lock: Turn-bolt privacy lock with external red/white indicator & emergency coin release');
      lines.push('• Adjustable Supporting Legs: Heavy-duty 100mm–150mm ground clearance legs');
      lines.push('• Door Knob / Pull Handle: Ergonomic double-sided architectural pull');
      lines.push('• Coat Hook with Buffer: Heavy-duty hook with integrated rubber door buffer stop');
      lines.push('• Top Headrail: Continuous overhead box extrusion stabilizer rail');
      lines.push('• Wall Fixing: Full-height anodized U-channels with Grade 304 stainless steel fasteners');
    } else if (model.category === 'Lockers') {
      lines.push('• Heavy-Duty Concealed Pivot Hinges (2 pcs per locker compartment door)');
      lines.push('• Master-Keyed Security Cam Lock with 2 individual keys');
      lines.push('• Anodized Aluminum Locker Door Number Plate');
      lines.push('• Dual Air Ventilation Louvers per compartment');
      lines.push('• Heavy-Duty Base Plinth Leveler Legs');
    } else if (model.category === 'Urinal Partitions') {
      lines.push('• Heavy-Duty Wall Mounting Corner L-Clamps (Grade 304 Stainless Steel)');
      if (model.hasExtraLeg || model.title.toLowerCase().includes('model a')) {
        lines.push('• Extra Floor Supporting Leg (100–150mm adjustable ground clearance)');
      }
      lines.push('• Wall Anchors & Fasteners with Decorative Caps');
    } else if (model.category === 'Kids Toilet') {
      lines.push('• Nylon Safety Spring Hinges (Soft & Self-Closing Pair)');
      lines.push('• Emergency Release Coin Latch / Safety Turn Lock with Outside Accessibility');
      lines.push('• Ergonomic Rounded Child Door Knob');
      lines.push('• Safety Coat & Bag Hook with Integrated Soft Rubber Buffer');
      lines.push('• Adjustable Floor Support Legs (100–150mm ground clearance)');
      lines.push('• Continuous Top Headrail Stabilizer Box Extrusion');
      lines.push('• Full-Height Wall Fixing U-Channels & Anti-Tamper Fasteners');
    }
  }

  return lines.join('\n');
}

export interface ExtractedModelDimensions {
  cubicleSize: string;
  doorSize: string;
  overallHeight: string;
  boardThickness: string;
  boardType: string;
  hardwarePackage: string;
  make: string;
  width?: string;
  depth?: string;
  height?: string;
  rowCount?: number;
  columnCount?: number;
}

/**
 * Extracts cubicleSize, doorSize, overallHeight, boardThickness, boardType from a model.
 * Faithfully preserves exact architectural dimensions (Width, Depth, Height, Thickness, Tiers, Columns)
 * defined on the catalog model.
 */
export function extractModelDimensions(model: ProductCatalogModel): ExtractedModelDimensions {
  const specs = model.specifications || [];

  const findSpec = (patterns: string[]): string => {
    for (const p of patterns) {
      const match = specs.find((s) => s.label && typeof s.label === 'string' && s.label.toLowerCase().includes(p.toLowerCase()));
      if (match && match.value !== undefined && match.value !== null) {
        if (typeof match.value === 'object') continue;
        const valStr = String(match.value).trim();
        if (valStr && valStr !== '[object Object]') return valStr;
      }
    }
    return '';
  };

  const cleanDim = (val: string | number | undefined, defaultSuffix: string = 'mm'): string => {
    if (val === undefined || val === null) return '';
    const s = String(val).trim();
    if (!s || s === '[object Object]') return '';
    if (/^\d+(\.\d+)?$/.test(s)) {
      return `${s}${defaultSuffix}`;
    }
    return s.replace(/\s+(mm|cm|m|in|ft)\b/gi, '$1');
  };

  // Check hardware metadata object if present in specifications
  const hwMeta = specs.find((s) => s.label === '__hardware_meta')?.value;
  const metaObj = (hwMeta && typeof hwMeta === 'object') ? hwMeta as Record<string, any> : {};

  const rawWidth = model.width || metaObj.width || findSpec(['unit / column width', 'column width', 'unit width', 'standard width', 'width', 'bay width']);
  const rawDepth = model.depth || metaObj.depth || findSpec(['standard depth', 'carcass depth', 'depth', 'cubicle size']);
  const rawHeight = model.height || metaObj.height || findSpec(['standard height', 'overall height', 'total height', 'height']);
  const rawThickness = model.boardThickness || metaObj.boardThickness || findSpec(['board thickness', 'panel thickness', 'thickness']);
  const rawDoorCandidate = findSpec(['door size', 'door width', 'compartment size']);
  const rawDoor = (rawDoorCandidate && !rawDoorCandidate.toLowerCase().includes('doors') && !rawDoorCandidate.toLowerCase().includes('col')) ? rawDoorCandidate : '';
  const rawRows = model.rowCount || model.tierCount || metaObj.rowCount || metaObj.tierCount || findSpec(['number of rows / tiers', 'number of rows', 'tiers', 'rows', 'tier count']);
  const rawCols = model.columnCount || metaObj.columnCount || findSpec(['number of columns', 'columns', 'column count', 'column']);

  let cubicleSize = '';
  let doorSize = '';
  let overallHeight = '';
  let boardThickness = '';

  if (model.category === 'Lockers') {
    const w = cleanDim(rawWidth) || '300mm';
    const d = cleanDim(rawDepth) || '450mm';
    const rawHStr = cleanDim(rawHeight);
    const rows = Number(rawRows) || (model.title.includes('3 Tier') ? 3 : model.title.includes('4 Tier') ? 4 : model.title.includes('2 Tier') ? 2 : model.title.includes('1 Tier') ? 1 : 4);
    const numH = parseInt(rawHStr.replace(/[^0-9]/g, '')) || 1800;
    // If the height defined on the model is per-compartment (e.g. 600mm, 443mm, 450mm) and rows >= 2, total architectural height is rows * numH
    const totalH = (numH < 1000 && rows >= 2) ? (numH * rows) : (numH >= 1000 ? numH : 1800);
    const compH = Math.round(totalH / rows);
    const h = `${totalH}mm`;

    // Full 3D architectural dimension mentioned in model: Width W × Depth D × Height H
    cubicleSize = `${w} W × ${d} D × ${h} H`;

    if (rawDoor && (rawDoor.includes('×') || rawDoor.includes('x') || rawDoor.toLowerCase().includes('mm'))) {
      doorSize = rawDoor;
    } else {
      doorSize = `${rows} Tier Modular Doors (${w} W × ${compH}mm H per door)`;
    }

    overallHeight = `${h} (plus 100mm plinth base)`;
    boardThickness = rawThickness ? String(rawThickness) : '9mm / 12mm Solid Compact Phenolic Laminate';

    return {
      cubicleSize,
      doorSize,
      overallHeight,
      boardThickness,
      boardType: 'HPL',
      hardwarePackage: 'Heavy-Duty Uniform Standard Locker Hardware',
      make: model.features?.find(f => f.toLowerCase().includes('make')) || 'Pacific',
      width: w,
      depth: d,
      height: h,
      rowCount: rows,
      columnCount: Number(rawCols) || 1,
    };
  } else if (model.category === 'Cubicle') {
    const w = cleanDim(rawWidth);
    const d = cleanDim(rawDepth) || '1500mm';
    const h = cleanDim(rawHeight) || '1980 mm / 2000 mm';

    const explicitCubicleSize = findSpec(['cubicle size']);
    if (explicitCubicleSize && (explicitCubicleSize.includes('×') || explicitCubicleSize.includes('x'))) {
      cubicleSize = explicitCubicleSize;
    } else {
      const cubicleW = (w && !w.includes('600') && !w.toLowerCase().includes('door')) ? w : '1000mm';
      cubicleSize = `${cubicleW} W × ${d} D`;
    }

    if (rawDoor && (rawDoor.includes('×') || rawDoor.includes('x'))) {
      doorSize = rawDoor;
    } else {
      const doorW = cleanDim(w) || '600mm';
      doorSize = `${doorW} × 1785mm (Standard)`;
    }

    overallHeight = h.toLowerCase().includes('ground') ? h : `${h} (incl. 150mm ground clearance)`;
    boardThickness = rawThickness ? String(rawThickness) : '12mm / 18mm Solid Compact Phenolic Laminate';
  } else if (model.category === 'Urinal Partitions') {
    const w = cleanDim(rawWidth) || '450mm';
    const h = cleanDim(rawHeight) || '900mm';

    cubicleSize = `${w} W × ${h} H`;
    doorSize = 'N/A (Divider Screen)';
    overallHeight = model.hasExtraLeg
      ? `${h} – 1200mm (floor & wall supported with extra leg)`
      : `${h} (affixed 300mm above finished floor)`;
    boardThickness = rawThickness ? String(rawThickness) : '12mm Solid Compact Phenolic Laminate';
  } else if (model.category === 'Kids Toilet') {
    const w = cleanDim(rawWidth) || '500mm';
    const d = cleanDim(rawDepth) || '1200mm';
    const h = cleanDim(rawHeight) || '1200 mm – 1500 mm';

    cubicleSize = `900mm W × ${d} D`;
    doorSize = `${w} × 1050mm (Child Ergonomic Safety Door)`;
    overallHeight = h.toLowerCase().includes('height') ? h : `${h} (Child-Friendly Ergonomic Height)`;
    boardThickness = rawThickness ? String(rawThickness) : '12mm Solid Compact Phenolic Laminate';
  } else {
    // Custom / other category
    const w = cleanDim(rawWidth);
    const d = cleanDim(rawDepth);
    const h = cleanDim(rawHeight);
    if (w && d && h) {
      cubicleSize = `${w} W × ${d} D × ${h} H`;
    } else if (w && d) {
      cubicleSize = `${w} W × ${d} D`;
    } else if (w && h) {
      cubicleSize = `${w} W × ${h} H`;
    } else if (d) {
      cubicleSize = `${d} D`;
    } else {
      cubicleSize = findSpec(['size', 'dimension']);
    }
    doorSize = rawDoor || '';
    overallHeight = h || '';
    boardThickness = rawThickness ? String(rawThickness) : '';
  }

  let hardwarePackage = '';
  if (model.category === 'Cubicle') {
    hardwarePackage = '';
  } else if (model.category === 'Urinal Partitions') {
    hardwarePackage = model.hasExtraLeg
      ? 'Grade 304 Wall Clamps + Extra Floor Supporting Leg'
      : 'Grade 304 Wall Mount Cantilever Clamps';
  } else if (model.category === 'Kids Toilet') {
    hardwarePackage = 'Child Safety Ergonomic Hardware (Anti-Finger Pinch & Emergency Release)';
  }

  let make = findSpec(['make', 'brand', 'manufacturer']) || 'Pacific';

  return {
    cubicleSize,
    doorSize,
    overallHeight,
    boardThickness,
    boardType: 'HPL',
    hardwarePackage,
    make,
    width: cleanDim(rawWidth),
    depth: cleanDim(rawDepth),
    height: cleanDim(rawHeight),
    rowCount: Number(rawRows) || undefined,
    columnCount: Number(rawCols) || undefined,
  };
}

export interface ExtractedHardwareItem {
  id?: string;
  itemType: 'hardware';
  description: string;
  hsnSac: string;
  quantity: number;
  unit: string;
  rate: number;
  gstRate: number;
  isCustom?: boolean;
}

/**
 * Extracts individual hardware line items from a catalog model, each with proper default unit, HSN (8302/7610), quantity, and rate.
 */
export function extractModelHardwareItems(
  model: ProductCatalogModel,
  cubicleQuantity: number = 1
): ExtractedHardwareItem[] {
  const items: ExtractedHardwareItem[] = [];

  const resolveUnitAndHsn = (name: string): { unit: string; hsn: string; defaultQty: number } => {
    const lower = name.toLowerCase();
    if (lower.includes('hinge') || lower.includes('pivot')) {
      return { unit: 'PAIR', hsn: '8302', defaultQty: 1 };
    }
    if (lower.includes('lock') || lower.includes('indicator') || lower.includes('turn')) {
      return { unit: 'SET', hsn: '8302', defaultQty: 1 };
    }
    if (lower.includes('handle') || lower.includes('knob') || lower.includes('pull')) {
      return { unit: 'NOS', hsn: '8302', defaultQty: 1 };
    }
    if (lower.includes('hook') || lower.includes('buffer')) {
      return { unit: 'NOS', hsn: '8302', defaultQty: 1 };
    }
    if (lower.includes('leg') || lower.includes('shoe') || lower.includes('foot') || lower.includes('feet')) {
      return { unit: 'NOS', hsn: '8302', defaultQty: 2 };
    }
    if (lower.includes('headrail') || lower.includes('rail') || lower.includes('box')) {
      return { unit: 'RMT', hsn: '7610', defaultQty: 1 };
    }
    if (lower.includes('channel') || lower.includes('u-channel') || lower.includes('fastener') || lower.includes('clamp')) {
      return { unit: 'SET', hsn: '8302', defaultQty: 1 };
    }
    if (lower.includes('number plate') || lower.includes('louver')) {
      return { unit: 'NOS', hsn: '8302', defaultQty: 1 };
    }
    return { unit: 'SET', hsn: '8302', defaultQty: 1 };
  };

  if (model.hardwareList && model.hardwareList.length > 0) {
    model.hardwareList.forEach((h) => {
      const cleanName = h.name.replace(/\s*\[SS Hardware\]\s*/gi, ' ').trim();
      const { unit, hsn, defaultQty } = resolveUnitAndHsn(cleanName);
      items.push({
        itemType: 'hardware',
        description: cleanName,
        hsnSac: hsn,
        quantity: Math.max(1, defaultQty * (cubicleQuantity || 1)),
        unit,
        rate: 0,
        gstRate: 18,
      });
    });
  } else {
    // Default fallback hardware components by category
    if (model.category === 'Cubicle') {
      const defaults = [
        { name: 'Gravity Hinges (Self-Closing Pair with Nylon Cam)', unit: 'PAIR', hsn: '8302', qty: 1 },
        { name: 'Occupancy Indicator Lock with Emergency Release', unit: 'SET', hsn: '8302', qty: 1 },
        { name: 'Ergonomic Door Pull Handle / Knob', unit: 'NOS', hsn: '8302', qty: 1 },
        { name: 'Coat Hook with Integrated Rubber Buffer Stop', unit: 'NOS', hsn: '8302', qty: 1 },
        { name: 'Adjustable Supporting Legs (100–150mm ground clearance)', unit: 'NOS', hsn: '8302', qty: 2 },
        { name: 'Continuous Top Headrail Stabilizer Box Extrusion', unit: 'RMT', hsn: '7610', qty: 1 },
        { name: 'Wall Fixing U-Channels & SS 304 Fasteners Pack', unit: 'SET', hsn: '8302', qty: 1 },
      ];
      defaults.forEach((d) => {
        items.push({
          itemType: 'hardware',
          description: d.name,
          hsnSac: d.hsn,
          quantity: Math.max(1, d.qty * (cubicleQuantity || 1)),
          unit: d.unit,
          rate: 0,
          gstRate: 18,
        });
      });
    } else if (model.category === 'Lockers') {
      const defaults = [
        { name: 'Heavy-Duty Concealed Pivot Hinges (Pair per door)', unit: 'PAIR', hsn: '8302', qty: 1 },
        { name: 'Master-Keyed Security Cam Lock with 2 Keys', unit: 'SET', hsn: '8302', qty: 1 },
        { name: 'Anodized Aluminum Locker Door Number Plate', unit: 'NOS', hsn: '8302', qty: 1 },
        { name: 'Dual Air Ventilation Louvers Pack', unit: 'SET', hsn: '8302', qty: 1 },
        { name: 'Heavy-Duty Base Plinth Leveler Legs', unit: 'NOS', hsn: '8302', qty: 4 },
      ];
      defaults.forEach((d) => {
        items.push({
          itemType: 'hardware',
          description: d.name,
          hsnSac: d.hsn,
          quantity: Math.max(1, d.qty * (cubicleQuantity || 1)),
          unit: d.unit,
          rate: 0,
          gstRate: 18,
        });
      });
    } else if (model.category === 'Urinal Partitions') {
      const defaults = [
        { name: 'Heavy-Duty Grade 304 Stainless Steel Corner L-Clamps', unit: 'SET', hsn: '8302', qty: 1 },
        { name: 'Wall Anchors & SS 304 Fasteners Pack', unit: 'SET', hsn: '8302', qty: 1 },
      ];
      if (model.hasExtraLeg || model.title.toLowerCase().includes('model a')) {
        defaults.push({
          name: 'Extra Floor Supporting Leg (100–150mm adjustable ground clearance)',
          unit: 'NOS',
          hsn: '8302',
          qty: 1,
        });
      }
      defaults.forEach((d) => {
        items.push({
          itemType: 'hardware',
          description: d.name,
          hsnSac: d.hsn,
          quantity: Math.max(1, d.qty * (cubicleQuantity || 1)),
          unit: d.unit,
          rate: 0,
          gstRate: 18,
        });
      });
    } else if (model.category === 'Kids Toilet') {
      const defaults = [
        { name: 'Nylon Safety Spring Hinges (Soft & Self-Closing Pair)', unit: 'PAIR', hsn: '8302', qty: 1 },
        { name: 'Emergency Release Coin Latch / Safety Turn Lock', unit: 'SET', hsn: '8302', qty: 1 },
        { name: 'Ergonomic Rounded Child Door Knob', unit: 'NOS', hsn: '8302', qty: 1 },
        { name: 'Safety Coat & Bag Hook with Soft Buffer', unit: 'NOS', hsn: '8302', qty: 1 },
        { name: 'Adjustable Floor Support Legs (100–150mm ground clearance)', unit: 'NOS', hsn: '8302', qty: 2 },
        { name: 'Continuous Top Headrail Stabilizer Box Extrusion', unit: 'RMT', hsn: '7610', qty: 1 },
        { name: 'Wall Fixing U-Channels & Anti-Tamper Fasteners Pack', unit: 'SET', hsn: '8302', qty: 1 },
      ];
      defaults.forEach((d) => {
        items.push({
          itemType: 'hardware',
          description: d.name,
          hsnSac: d.hsn,
          quantity: Math.max(1, d.qty * (cubicleQuantity || 1)),
          unit: d.unit,
          rate: 0,
          gstRate: 18,
        });
      });
    }
  }

  return items;
}

/**
 * Intelligently finds the best matching catalog model from quotation item metadata,
 * product IDs, model slugs, or item description text.
 */
export function findMatchingCatalogModel(
  catalogModels: ProductCatalogModel[],
  candidate: { productId?: string; description?: string; modelId?: string }
): ProductCatalogModel | undefined {
  if (!catalogModels || catalogModels.length === 0) return undefined;

  // 1. Direct ID or Slug match
  const candidateId = (candidate.productId || candidate.modelId || '').trim().toLowerCase();
  if (candidateId) {
    const directMatch = catalogModels.find(
      (m) => m.id.toLowerCase() === candidateId || m.slug.toLowerCase() === candidateId
    );
    if (directMatch) return directMatch;
  }

  // 2. Search for model titles in description
  const desc = (candidate.description || '').toLowerCase();
  if (desc) {
    for (const m of catalogModels) {
      if (m.title && desc.includes(m.title.toLowerCase())) {
        return m;
      }
      if (m.slug && desc.includes(m.slug.toLowerCase())) {
        return m;
      }
    }

    // 3. Category heuristics
    if (desc.includes('kids') || desc.includes('child') || desc.includes('kindergarten') || desc.includes('school')) {
      const kids = catalogModels.find((m) => m.category === 'Kids Toilet');
      if (kids) return kids;
    }
    if (desc.includes('locker')) {
      const locker = catalogModels.find((m) => m.category === 'Lockers');
      if (locker) return locker;
    }
    if (desc.includes('urinal') || desc.includes('screen') || desc.includes('divider')) {
      const urinal = catalogModels.find((m) => m.category === 'Urinal Partitions');
      if (urinal) return urinal;
    }
  }

  // 4. Default fallback: Delight or first available cubicle model
  const defaultCubicle =
    catalogModels.find((m) => m.title.toLowerCase().includes('delight')) ||
    catalogModels.find((m) => m.category === 'Cubicle') ||
    catalogModels[0];

  return defaultCubicle;
}

