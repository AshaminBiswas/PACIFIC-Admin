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

/**
 * Extracts cubicleSize, doorSize, overallHeight, boardThickness, boardType from a model.
 */
export function extractModelDimensions(model: ProductCatalogModel) {
  const specs = model.specifications || [];

  const findSpec = (patterns: string[]): string => {
    for (const p of patterns) {
      const match = specs.find((s) => s.label.toLowerCase().includes(p.toLowerCase()));
      if (match && match.value.trim()) return match.value.trim();
    }
    return '';
  };

  let cubicleSize = findSpec(['cubicle size', 'compartment', 'standard depth', 'depth']);
  let doorSize = findSpec(['door size', 'door width', 'door', 'configuration']);
  let overallHeight = findSpec(['overall height', 'standard height', 'height']);
  let boardThickness = findSpec(['board thickness', 'thickness']);

  // Defaults per category if missing in custom model
  if (model.category === 'Kids Toilet') {
    if (!cubicleSize) {
      cubicleSize = '900mm W × 1200mm D';
    } else if (!cubicleSize.toLowerCase().includes('w') && !cubicleSize.includes('×') && !cubicleSize.includes('x')) {
      cubicleSize = `900mm W × ${cubicleSize}`;
    }
    if (!doorSize) doorSize = '500mm × 1050mm (Child Ergonomic Safety Door)';
    if (!overallHeight) overallHeight = '1200 mm – 1500 mm (Child-Friendly Ergonomic Height)';
    if (!boardThickness) boardThickness = '12mm Solid Compact Phenolic Laminate';
  } else if (model.category === 'Cubicle') {
    if (!cubicleSize) {
      cubicleSize = '1000mm W × 1500mm D';
    } else if (!cubicleSize.toLowerCase().includes('w') && !cubicleSize.includes('×') && !cubicleSize.includes('x')) {
      cubicleSize = `1000mm W × ${cubicleSize}`;
    }
    if (!doorSize) doorSize = '600mm × 1785mm (Standard)';
    if (!overallHeight) overallHeight = '1980 mm / 2000 mm (incl. 150mm ground clearance)';
    if (!boardThickness) boardThickness = '12mm / 18mm Solid Compact Phenolic Laminate';
  } else if (model.category === 'Lockers') {
    if (!cubicleSize) cubicleSize = '300mm W × 450mm D × 1800mm H';
    if (!doorSize) doorSize = 'Tier Modular Doors as per drawing';
    if (!overallHeight) overallHeight = '1800mm (plus 100mm plinth base)';
    if (!boardThickness) boardThickness = '12mm Solid Compact Phenolic Laminate';
  } else if (model.category === 'Urinal Partitions') {
    if (!cubicleSize) cubicleSize = '450mm W × 900mm H';
    if (!doorSize) doorSize = 'N/A (Divider Screen)';
    if (!overallHeight) overallHeight = model.hasExtraLeg ? '900mm – 1200mm (floor & wall supported)' : '900mm (with 300mm floor clearance)';
    if (!boardThickness) boardThickness = '12mm Solid Compact Phenolic Laminate';
  }

  let hardwarePackage = '';
  if (model.category === 'Cubicle') {
    hardwarePackage = '';
  } else if (model.category === 'Lockers') {
    hardwarePackage = 'Heavy-Duty Uniform Standard Locker Hardware';
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

