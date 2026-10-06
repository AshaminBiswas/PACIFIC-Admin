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
