/**
 * Centralized Branch Detection and Filtering Utilities.
 * Correctly identifies Kolkata Branch vs Main Delhi Branch documents across
 * Quotations, Proforma Invoices, Sales Orders, Tax Invoices, and Packing Lists.
 */

export const KOLKATA_COMPANY_ID = 'a25090ef-f6c0-407f-8b1e-1da8d506308c';

export function isKolkataBranch(doc: any): boolean {
  if (!doc) return false;

  // 1. Direct document sequence prefix or code
  const docNum = (
    doc.referenceNumber ||
    doc.quotationNumber ||
    doc.piNumber ||
    doc.orderNumber ||
    doc.invoiceNumber ||
    doc.packingListNumber ||
    doc.documentNumber ||
    ''
  ).toUpperCase();

  if (docNum.startsWith('PPSK/') || docNum.includes('KOL')) {
    return true;
  }

  // 2. Company profile ID
  if (doc.companyProfileId === KOLKATA_COMPANY_ID) {
    return true;
  }

  // 3. Company Profile entity code, state, or name
  const comp = doc.companyProfile || doc.company;
  if (comp) {
    if (comp.id === KOLKATA_COMPANY_ID) return true;
    if (comp.entityCode === 'PPS-KOL' || comp.entityCode === 'PRC-KOL') return true;
    if (comp.stateCode === '19') return true;

    const compName = (comp.companyName || comp.legalName || '').toLowerCase();
    if (compName.includes('kolkata')) return true;

    const compState = (comp.state || '').toLowerCase();
    if (compState.includes('bengal')) return true;
  }

  // 4. Flat company / party name or state
  const rawCompName = (doc.companyName || '').toLowerCase();
  if (rawCompName.includes('kolkata')) return true;

  const rawState = (doc.state || '').toLowerCase();
  if (rawState.includes('bengal')) return true;

  // 5. Site / project location mention
  const site = (doc.siteAddress || doc.siteName || doc.projectName || '').toLowerCase();
  if (site.includes('kolkata') || site.includes('west bengal') || site.includes('salt lake')) {
    return true;
  }

  return false;
}

export function filterByBranch<T>(items: T[], branchFilter: 'ALL' | 'MAIN' | 'KOLKATA' | 'DELHI' | string): T[] {
  if (branchFilter === 'KOLKATA' || branchFilter === 'KOL') {
    return items.filter((item) => isKolkataBranch(item));
  }
  if (branchFilter === 'MAIN' || branchFilter === 'DELHI') {
    return items.filter((item) => !isKolkataBranch(item));
  }
  return items;
}
