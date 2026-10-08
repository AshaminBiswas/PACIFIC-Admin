/**
 * Utility functions and constants for Pacific Quotation Cubicle Installation Charges.
 * Supports both:
 * 1. Rate-based calculations (Per Cubicle calculation, e.g. ₹ 800, ₹ 1000, etc.)
 * 2. Non-rated term options when rate is not selected:
 *    - "Included" (Installation included in basic price / Free of Cost)
 *    - "Extra to Pay" (Payable extra at actuals by client)
 *    - "Client Scope" (In Buyer's / Client's scope - Pacific supply only)
 *    - "Not Applicable" (Supply of material only)
 *    - "Custom" (Custom scope/wording)
 */

export type InstallationPricingMode = 'RATE' | 'OPTION';

export type InstallationTermOption =
  | 'Included'
  | 'Extra to Pay'
  | 'Client Scope'
  | 'Not Applicable'
  | 'Custom';

export interface InstallationOptionDef {
  id: InstallationTermOption;
  label: string;
  badgeLabel: string;
  description: string;
  shortDesc: string;
}

export const INSTALLATION_OPTIONS: readonly InstallationOptionDef[] = [
  {
    id: 'Included',
    label: 'Included in Basic Price',
    badgeLabel: 'Included',
    description: 'Installation is INCLUDED in basic price (Free of Cost / F.O.C.)',
    shortDesc: 'Included in Basic Price',
  },
  {
    id: 'Extra to Pay',
    label: 'Extra to Pay (At Actuals)',
    badgeLabel: 'Extra to Pay',
    description: 'Installation is EXTRA TO PAY (Payable extra at actuals by client)',
    shortDesc: 'Extra to Pay at Actuals',
  },
  {
    id: 'Client Scope',
    label: "In Client's / Buyer's Scope",
    badgeLabel: 'Client Scope',
    description: "Installation is in Buyer's / Client's scope (Pacific supply only)",
    shortDesc: "In Client's Scope",
  },
  {
    id: 'Not Applicable',
    label: 'Not Applicable (Supply Only)',
    badgeLabel: 'Supply Only (N/A)',
    description: 'Installation is Not Applicable (Material supply only)',
    shortDesc: 'Supply Only (N/A)',
  },
  {
    id: 'Custom',
    label: 'Custom Terms / Scope...',
    badgeLabel: 'Custom',
    description: 'Custom installation term / note specified by user',
    shortDesc: 'Custom Terms',
  },
] as const;

export const RATE_PRESETS = [
  { label: '₹ 800', rate: 800 },
  { label: '₹ 1,000 (Std)', rate: 1000 },
  { label: '₹ 1,200', rate: 1200 },
  { label: '₹ 1,500', rate: 1500 },
] as const;

/**
 * Returns formatted text shown on document preview / summary for installation.
 */
export function getInstallationMentionText(
  mode: InstallationPricingMode,
  option: string = 'Included',
  rate?: number,
  count?: number,
  customNote?: string,
  totalCharge: number = 0
): string {
  if (mode === 'RATE' && (rate || 0) > 0 && totalCharge > 0) {
    const c = count && count > 0 ? count : 1;
    return `Cubicle Installation Charges (@ ₹ ${(rate || 0).toLocaleString('en-IN')}/Cubicle for ${c} Cubicle${c === 1 ? '' : 's'})`;
  }

  if (option === 'Included') {
    return 'Cubicle Installation Charges — Included in Basic Price (Free of Cost)';
  }
  if (option === 'Extra to Pay') {
    return 'Cubicle Installation Charges — Extra to Pay (Payable extra at actuals by client)';
  }
  if (option === 'Client Scope') {
    return "Cubicle Installation Charges — In Client's / Buyer's Scope (Pacific Supply Only)";
  }
  if (option === 'Not Applicable') {
    return 'Cubicle Installation Charges — Not Applicable (Material Supply Only)';
  }
  if (option === 'Custom' && customNote?.trim()) {
    return `Cubicle Installation Charges — ${customNote.trim()}`;
  }

  return 'Cubicle Installation Charges — Included in Basic Price';
}

/**
 * Returns formatted clause for quotation General Terms.
 */
export function formatInstallationTermClause(
  mode: InstallationPricingMode,
  option: string = 'Included',
  rate?: number,
  count?: number,
  customNote?: string,
  totalCharge: number = 0
): string {
  if (mode === 'RATE' && (rate || 0) > 0 && totalCharge > 0) {
    const c = count && count > 0 ? count : 1;
    return `Cubicle installation is charged @ ₹ ${(rate || 0).toLocaleString('en-IN')}/cubicle for ${c} cubicle${c === 1 ? '' : 's'}. Site readiness (finished flooring, plumb walls, civil unloading, and electricity) required prior to installation.`;
  }

  if (option === 'Included') {
    return 'Cubicle installation is INCLUDED in the quoted basic price. Site readiness (finished floor level and plumb walls) required prior to installation.';
  }
  if (option === 'Extra to Pay') {
    return 'Cubicle installation is EXTRA TO PAY (payable at actuals by client / site contractor). Site readiness required prior to installation.';
  }
  if (option === 'Client Scope') {
    return "Cubicle installation is in Buyer's / Client's scope. Pacific scope covers supply only.";
  }
  if (option === 'Not Applicable') {
    return 'Installation is Not Applicable (Supply of restroom cubicle materials only).';
  }
  if (option === 'Custom' && customNote?.trim()) {
    return `${customNote.trim()} Site readiness required prior to installation.`;
  }

  return 'Cubicle installation is INCLUDED in the quoted basic price. Site readiness (finished floor level and plumb walls) required prior to installation.';
}

/**
 * Updates or replaces clause 4 (Installation / Site Readiness) in generalTerms string.
 */
export function syncInstallationToGeneralTerms(
  currentTerms: string,
  newClause: string
): string {
  if (!currentTerms) {
    return `1. Price Basis: Ex-works New Delhi factory.\n2. Taxes: GST as applicable at the time of invoice.\n3. Unloading & Safe Storage: In buyer’s scope at site.\n4. Installation: ${newClause}`;
  }

  const lines = currentTerms.split('\n');
  let replaced = false;

  const newLines = lines.map((line) => {
    if (/^(4\.|•\s*4\.|4\))\s*(installation|site readiness|cubicle installation)/i.test(line.trim())) {
      replaced = true;
      return `4. Installation: ${newClause}`;
    }
    return line;
  });

  if (replaced) {
    return newLines.join('\n');
  }

  // If there's an existing 4. line of any kind
  const hasFour = newLines.some((l) => /^4\./i.test(l.trim()));
  if (hasFour) {
    return newLines.map((l) => (/^4\./i.test(l.trim()) ? `4. Installation: ${newClause}` : l)).join('\n');
  }

  return `${currentTerms.trim()}\n4. Installation: ${newClause}`;
}

/**
 * Detects the installation term from existing quotation text if installationCharge is 0.
 */
export function detectInstallationOption(generalTerms?: string, otherTerms?: string): InstallationTermOption {
  const combined = `${generalTerms || ''}\n${otherTerms || ''}`;
  const lines = combined.split('\n');
  const installLine = lines.find((l) => /installation/i.test(l)) || '';
  const target = (installLine || combined).toLowerCase();

  if (target.includes('included') || target.includes('f.o.c') || target.includes('free of cost')) {
    return 'Included';
  }
  if (target.includes('extra to pay') || target.includes('payable extra') || target.includes('at actuals')) {
    return 'Extra to Pay';
  }
  if (
    target.includes("buyer's scope") ||
    target.includes("buyer’s scope") ||
    target.includes("client's scope") ||
    target.includes('client scope')
  ) {
    return 'Client Scope';
  }
  if (target.includes('not applicable') || target.includes('supply only')) {
    return 'Not Applicable';
  }
  return 'Included';
}

/**
 * Updates or appends installation clause in PI terms array.
 */
export function syncInstallationToPiTerms(
  terms: string[],
  newClause: string
): string[] {
  const cleanClause = newClause.replace(/^(Installation:\s*|4\.\s*Installation:\s*)/i, '').trim();
  const installClauseText = `Installation: ${cleanClause}`;
  const installIdx = terms.findIndex((t) => /(installation|site readiness)/i.test(t));
  if (installIdx >= 0) {
    const updated = [...terms];
    updated[installIdx] = installClauseText;
    return updated;
  }
  return [...terms, installClauseText];
}

// ─────────────────────────────────────────────────────────────
// FREIGHT & TRANSPORTATION CONSTANTS & UTILITIES
// ─────────────────────────────────────────────────────────────

export type FreightTermOption =
  | 'Extra as Actual / To pay'
  | 'Included'
  | 'Client Scope'
  | 'Fixed'
  | 'Custom';

export interface FreightOptionDef {
  id: FreightTermOption;
  label: string;
  badgeLabel: string;
  description: string;
  shortDesc: string;
}

export const FREIGHT_OPTIONS: readonly FreightOptionDef[] = [
  {
    id: 'Included',
    label: 'Included in Basic Price (FOR Site)',
    badgeLabel: 'Included',
    description: 'Freight & transportation is INCLUDED in basic price (FOR site delivery)',
    shortDesc: 'Included in Basic Price',
  },
  {
    id: 'Extra as Actual / To pay',
    label: 'Extra as Actual / To Pay (At Actuals)',
    badgeLabel: 'Extra as Actual',
    description: 'Freight is EXTRA AS ACTUAL / TO PAY (payable at actuals by consignee at site)',
    shortDesc: 'Extra as Actual / To Pay',
  },
  {
    id: 'Client Scope',
    label: "In Client's / Buyer's Scope",
    badgeLabel: 'Client Scope',
    description: "Transportation is in Buyer's / Client's scope (Self pickup from factory/godown)",
    shortDesc: "In Client's Scope",
  },
  {
    id: 'Fixed',
    label: 'Fixed Freight Charge',
    badgeLabel: 'Fixed',
    description: 'Fixed freight & handling amount added to the commercial invoice total',
    shortDesc: 'Fixed Freight',
  },
  {
    id: 'Custom',
    label: 'Custom Freight Terms / Scope...',
    badgeLabel: 'Custom',
    description: 'Custom freight & handling term / note specified by user',
    shortDesc: 'Custom Terms',
  },
] as const;

export function getFreightMentionText(
  terms: string = 'Extra as Actual / To pay',
  amount: number = 0,
  customNote?: string
): string {
  if (amount > 0) {
    return `Freight & Handling — ₹ ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Fixed Charge Included in Total)`;
  }
  const cleanTerms = (terms || 'Extra as Actual / To pay').trim();
  if (cleanTerms === 'Included' || cleanTerms.toLowerCase().includes('included')) {
    return 'Freight & Handling — Included in Basic Price (FOR Site Delivery)';
  }
  if (cleanTerms === 'Client Scope' || cleanTerms.toLowerCase().includes('client')) {
    return "Freight & Handling — In Client's / Buyer's Scope (Self Pickup)";
  }
  if (cleanTerms === 'Custom' && customNote?.trim()) {
    return `Freight & Handling — ${customNote.trim()}`;
  }
  return 'Freight & Handling — Extra as Actual / To Pay (By Consignee at Site)';
}

export function formatFreightTermClause(
  terms: string = 'Extra as Actual / To pay',
  amount: number = 0,
  customNote?: string
): string {
  if (amount > 0) {
    return `Freight & Transportation: Freight and handling charges are fixed at ₹ ${amount.toLocaleString('en-IN')}, included in the total invoice value.`;
  }
  const cleanTerms = (terms || 'Extra as Actual / To pay').trim();
  if (cleanTerms === 'Included' || cleanTerms.toLowerCase().includes('included')) {
    return 'Freight & Transportation: Freight & transportation charges are INCLUDED in the basic product price (FOR site delivery).';
  }
  if (cleanTerms === 'Client Scope' || cleanTerms.toLowerCase().includes('client')) {
    return "Freight & Transportation: Transportation & logistics is in Buyer's / Client's scope. Material to be picked up from our factory/warehouse.";
  }
  if (cleanTerms === 'Custom' && customNote?.trim()) {
    return `Freight & Transportation: ${customNote.trim()}`;
  }
  return 'Freight & Transportation: Freight and handling charges are EXTRA AS ACTUAL / TO PAY by client/buyer at the time of site delivery.';
}

export function syncFreightToPiTerms(
  terms: string[] = [],
  newClause: string
): string[] {
  const cleanClause = newClause.replace(/^(Freight & Transportation:\s*|Freight:\s*)/i, '').trim();
  const freightClauseText = `Freight & Transportation: ${cleanClause}`;
  const freightIdx = terms.findIndex((t) => /(freight|transportation|dispatch transit)/i.test(t));
  if (freightIdx >= 0) {
    const updated = [...terms];
    updated[freightIdx] = freightClauseText;
    return updated;
  }
  return [...terms, freightClauseText];
}
