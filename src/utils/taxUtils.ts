/**
 * GST Calculation & State Code utilities for Pacific Restroom Cubicle Console
 * 
 * Rules:
 * Seller state is Delhi (07).
 * - If Place of Supply / Bill State is 07 (Delhi): Intra-state split => CGST 9% + SGST 9% (IGST = 0).
 * - If Place of Supply / Bill State is outside Delhi (!= 07): Inter-state => IGST 18% (CGST = 0, SGST = 0).
 * - If SEZ Exemption is active: GST 0% with statutory LUT tracking.
 */

export function isDelhiState(stateOrCode?: string | null): boolean {
  if (!stateOrCode) return false;
  const s = String(stateOrCode).trim().toLowerCase();
  return (
    s === '07' ||
    s.startsWith('07') ||
    s === 'delhi' ||
    s === 'dl' ||
    s.includes('delhi') ||
    s.includes('new delhi')
  );
}

export interface GstBreakdown {
  isIntraState: boolean;
  isSezExempt: boolean;
  taxableAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalGst: number;
  grandTotal: number;
}

export function computeGstBreakdown(
  taxableAmount: number,
  stateOrCode?: string | null,
  isSezExempt: boolean = false,
  standardRate: number = 18
): GstBreakdown {
  const taxable = Math.max(0, taxableAmount || 0);

  if (isSezExempt) {
    return {
      isIntraState: false,
      isSezExempt: true,
      taxableAmount: taxable,
      cgstRate: 0,
      cgstAmount: 0,
      sgstRate: 0,
      sgstAmount: 0,
      igstRate: 0,
      igstAmount: 0,
      totalGst: 0,
      grandTotal: Math.round(taxable),
    };
  }

  const isIntra = isDelhiState(stateOrCode);
  const rate = Number(standardRate) || 18;

  if (isIntra) {
    const halfRate = rate / 2; // 9% for 18% GST
    const cgstAmount = Math.round(taxable * (halfRate / 100) * 100) / 100;
    const sgstAmount = Math.round(taxable * (halfRate / 100) * 100) / 100;
    const totalGst = Math.round((cgstAmount + sgstAmount) * 100) / 100;
    return {
      isIntraState: true,
      isSezExempt: false,
      taxableAmount: taxable,
      cgstRate: halfRate,
      cgstAmount,
      sgstRate: halfRate,
      sgstAmount,
      igstRate: 0,
      igstAmount: 0,
      totalGst,
      grandTotal: Math.round(taxable + totalGst),
    };
  }

  // Inter-state: IGST
  const igstAmount = Math.round(taxable * (rate / 100) * 100) / 100;
  return {
    isIntraState: false,
    isSezExempt: false,
    taxableAmount: taxable,
    cgstRate: 0,
    cgstAmount: 0,
    sgstRate: 0,
    sgstAmount: 0,
    igstRate: rate,
    igstAmount,
    totalGst: igstAmount,
    grandTotal: Math.round(taxable + igstAmount),
  };
}
