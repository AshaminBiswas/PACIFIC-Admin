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

export const GST_STATE_CODE_MAP: Record<string, string> = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra and Nagar Haveli and Daman and Diu',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
};

export function isDelhiState(
  stateCode?: string | null,
  stateName?: string | null,
  gstin?: string | null,
  address?: string | null
): boolean {
  // 1. HIGHEST PRIORITY: GSTIN Number
  // Statutory rule: If GST number is provided, the first 2 digits are the sole determinant of tax jurisdiction:
  // Starts with '07' -> Delhi Intra-State (CGST: 9% + SGST: 9%)
  // Any other state code -> Inter-State (IGST: 18%)
  const cleanGstin = (gstin || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleanGstin.length >= 2) {
    return cleanGstin.startsWith('07');
  }

  // 2. Unregistered / B2C buyer fallback (when no GST number is provided)
  if (stateCode) {
    const cleanCode = stateCode.trim();
    if (cleanCode === '07' || cleanCode === '7') return true;
    // If state code is explicitly another 2-digit state (e.g. '06', '27'), it is NOT Delhi
    if (/^\d{1,2}$/.test(cleanCode) && cleanCode !== '07' && cleanCode !== '7') {
      return false;
    }
  }

  if (stateName) {
    const s = stateName.trim().toLowerCase();
    if (s === 'delhi' || s.includes('delhi')) return true;
    if (s.length > 0 && !s.includes('delhi')) return false;
  }

  if (address) {
    // Only if address explicitly contains Delhi and does not name another state
    if (
      /\b(new\s+delhi|delhi)\b/i.test(address) &&
      !/\b(haryana|gurgaon|gurugram|noida|uttar\s+pradesh|up|rajasthan|punjab|maharashtra|karnataka|gujarat|bengal)\b/i.test(address)
    ) {
      return true;
    }
  }

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
