/**
 * Universal Indian GST tax helper for Pacific Restroom Cubicle Admin Console
 *
 * Seller State: Delhi (State Code: '07')
 *
 * Rules:
 * 1. If Bill / Recipient state code is '07' or state name is 'Delhi' (case-insensitive):
 *    - Intra-state supply
 *    - Total GST (18%) is strictly SPLIT into:
 *      * CGST: 9%
 *      * SGST: 9%
 *      * IGST: 0%
 * 2. If Bill / Recipient state is NOT Delhi (Inter-state supply):
 *    - Total GST (18%) is applied as:
 *      * IGST: 18%
 *      * CGST: 0%
 *      * SGST: 0%
 * 3. If SEZ Exemption is active (LUT/Bond):
 *    - 0% GST (CGST 0%, SGST 0%, IGST 0%)
 */

export interface GstTaxBreakdown {
  isDelhi: boolean;
  isIntraState: boolean;
  isSez: boolean;
  taxableAmount: number;
  totalGstRate: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTax: number;
  grandTotal: number;
}

export function isDelhiState(
  stateCode?: string | null,
  stateName?: string | null,
  gstin?: string | null,
  address?: string | null
): boolean {
  if (stateCode && stateCode.trim() === '07') return true;
  if (stateName && stateName.trim().toLowerCase().includes('delhi')) return true;
  if (gstin && gstin.trim().startsWith('07')) return true;
  if (address && /delhi\b/i.test(address)) return true;
  return false;
}

export function calculateGstSplit(
  taxableAmount: number,
  stateCode?: string | null,
  stateName?: string | null,
  isSez = false,
  totalGstRate = 18,
  gstin?: string | null,
  address?: string | null
): GstTaxBreakdown {
  const taxable = Math.max(0, Number(taxableAmount) || 0);
  const isDelhi = isDelhiState(stateCode, stateName, gstin, address);

  if (isSez) {
    return {
      isDelhi,
      isIntraState: isDelhi,
      isSez: true,
      taxableAmount: taxable,
      totalGstRate: 0,
      cgstRate: 0,
      cgstAmount: 0,
      sgstRate: 0,
      sgstAmount: 0,
      igstRate: 0,
      igstAmount: 0,
      totalTax: 0,
      grandTotal: Math.round(taxable),
    };
  }

  const effectiveRate = Number(totalGstRate) || 18;
  const totalTax = Math.round(taxable * (effectiveRate / 100) * 100) / 100;

  if (isDelhi) {
    const halfRate = effectiveRate / 2; // 9%
    const halfTax = Math.round(taxable * (halfRate / 100) * 100) / 100;
    return {
      isDelhi: true,
      isIntraState: true,
      isSez: false,
      taxableAmount: taxable,
      totalGstRate: effectiveRate,
      cgstRate: halfRate,
      cgstAmount: halfTax,
      sgstRate: halfRate,
      sgstAmount: halfTax,
      igstRate: 0,
      igstAmount: 0,
      totalTax: Math.round(halfTax * 2 * 100) / 100,
      grandTotal: Math.round(taxable + halfTax * 2),
    };
  } else {
    return {
      isDelhi: false,
      isIntraState: false,
      isSez: false,
      taxableAmount: taxable,
      totalGstRate: effectiveRate,
      cgstRate: 0,
      cgstAmount: 0,
      sgstRate: 0,
      sgstAmount: 0,
      igstRate: effectiveRate,
      igstAmount: totalTax,
      totalTax,
      grandTotal: Math.round(taxable + totalTax),
    };
  }
}
