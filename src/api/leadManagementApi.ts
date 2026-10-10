import apiClient from './client';
import { salesQuotationsApi } from './salesQuotationsApi';
import type {
  ApiResponse,
  PaginatedResponse,
  Lead,
  LeadStatus,
  LeadProductCategory,
  LeadPriority,
  LeadFollowup,
  LeadFollowupChannel,
} from '../types/admin';

const STORAGE_KEY = 'pacific_lead_management_store_v2';
const LEGACY_STORAGE_KEYS = ['pacific_lead_management_store_v1'];

// Dummy lead IDs, numbers, emails, companies, and phones to permanently eradicate
const DUMMY_LEAD_IDS = new Set([
  'lead-001',
  'lead-002',
  'lead-003',
  'lead-004',
  'lead-005',
  'lead-006',
]);

const DUMMY_LEAD_NUMS = new Set([
  'LEAD-2026-001',
  'LEAD-2026-002',
  'LEAD-2026-003',
  'LEAD-2026-004',
  'LEAD-2026-005',
  'LEAD-2026-006',
]);

/**
 * Universal detector for legacy demo/seed dummy leads.
 * Matches any combination of ID, leadNumber, company, email, phone, or contact name.
 */
export function isDummyLead(l: Partial<Lead> | null | undefined): boolean {
  if (!l) return false;
  const id = String(l.id || '').toLowerCase();
  if (DUMMY_LEAD_IDS.has(id) || id.startsWith('lead-00')) return true;

  const num = String(l.leadNumber || '').toUpperCase();
  if (DUMMY_LEAD_NUMS.has(num)) return true;

  const email = String(l.email || '').toLowerCase().trim();
  if (
    email.includes('dlf.in') ||
    email.includes('cultfit.in') ||
    email.includes('shapoorji.com') ||
    email.includes('maxhealthcare.com') ||
    email.includes('studioarch.in') ||
    email.includes('itcinfotech.com')
  ) {
    return true;
  }

  const company = String(l.company || '').toLowerCase();
  if (
    company.includes('dlf cybercity') ||
    company.includes('curefit') ||
    company.includes('cult.fit') ||
    company.includes('shapoorji') ||
    company.includes('max healthcare') ||
    company.includes('studio arch') ||
    company.includes('itc infotech')
  ) {
    return true;
  }

  const name = `${l.firstName || ''} ${l.lastName || ''}`.toLowerCase().trim();
  if (
    name.includes('rohit sharma') ||
    name.includes('tanvi kulkarni') ||
    name.includes('rajesh nair') ||
    name.includes('vikram malhotra') ||
    name.includes('ananya verma') ||
    name.includes('amitabh roy')
  ) {
    return true;
  }

  const phone = String(l.phone || '').replace(/\D/g, '');
  if (
    phone.includes('9811234567') ||
    phone.includes('9876543210') ||
    phone.includes('9741288990') ||
    phone.includes('9810011223') ||
    phone.includes('9920155443') ||
    phone.includes('9830077665')
  ) {
    return true;
  }

  return false;
}

// Zero default dummy seeds
const INITIAL_LEADS: Lead[] = [];

// Helper to get local leads from localStorage
export function getStoredLeads(): Lead[] {
  if (typeof window === 'undefined') return [];
  try {
    // 1. Check current v2 storage key
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter((l: Lead) => !isDummyLead(l));
        if (cleaned.length !== parsed.length) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
        }
        return cleaned;
      }
    }

    // 2. One-time clean migration from legacy keys (v1): purge dummy records completely
    for (const legacyKey of LEGACY_STORAGE_KEYS) {
      const legacyRaw = localStorage.getItem(legacyKey);
      if (legacyRaw) {
        try {
          const parsed = JSON.parse(legacyRaw);
          if (Array.isArray(parsed)) {
            const genuineLeads = parsed.filter((l: Lead) => !isDummyLead(l));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(genuineLeads));
            localStorage.removeItem(legacyKey);
            return genuineLeads;
          }
        } catch {}
        localStorage.removeItem(legacyKey);
      }
    }

    // 3. Initialize cleanly with empty list
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  } catch (err) {
    console.warn('[leadManagementApi] Failed to parse stored leads:', err);
  }
  return [];
}

export function saveStoredLeads(leads: Lead[]): void {
  if (typeof window === 'undefined') return;
  try {
    // Never allow any dummy seed record to be saved
    const cleaned = leads.filter((l) => !isDummyLead(l));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  } catch (err) {
    console.error('[leadManagementApi] Failed to persist leads:', err);
  }
}

export interface LeadFilterParams {
  category?: LeadProductCategory | string;
  status?: LeadStatus | string;
  priority?: LeadPriority | string;
  source?: string;
  search?: string;
  page?: number;
  limit?: number;
  dueFilter?: 'ALL' | 'OVERDUE' | 'TODAY' | 'UPCOMING';
}

export interface LeadStatsSummary {
  total: number;
  hotCount: number;
  interestedCount: number;
  quotedCount: number;
  wonCount: number;
  wonValue: number;
  pipelineValue: number;
  overdueFollowups: number;
  dueTodayFollowups: number;
  byCategory: {
    cubicle: number;
    locker: number;
    urinal: number;
    combo: number;
  };
}

export interface GenerateQuotationOptions {
  leadId: string;
  ratePerUnit?: number;
  installationPerUnit?: number;
  freightTerms?: string;
  hardwarePackage?: string;
  customNotes?: string;
  validDays?: number;
}

export const leadManagementApi = {
  /**
   * List leads with filters, search, and pagination
   */
  async list(params: LeadFilterParams = {}): Promise<ApiResponse<PaginatedResponse<Lead>>> {
    const {
      category = 'ALL',
      status = 'ALL',
      priority = 'ALL',
      source = 'ALL',
      search = '',
      page = 1,
      limit = 25,
      dueFilter = 'ALL',
    } = params;

    let leads = getStoredLeads();

    // Try backend fetch if available, fallback to local storage
    try {
      const backendRes = await apiClient.get<ApiResponse<PaginatedResponse<Lead>>>('/leads', {
        params: { page, limit, status: status !== 'ALL' ? status : undefined, search: search || undefined },
      });
      if (backendRes.data?.data?.items?.length) {
        // Merge with our rich local specs - strictly exclude any dummy items
        const backendItems = backendRes.data.data.items.filter((b) => !isDummyLead(b));
        const mergedMap = new Map<string, Lead>();
        leads.forEach((l) => {
          if (!isDummyLead(l)) mergedMap.set(l.id, l);
        });
        backendItems.forEach((b) => {
          if (!mergedMap.has(b.id) && !isDummyLead(b)) {
            mergedMap.set(b.id, {
              ...b,
              productCategory: b.productCategory || 'RESTROOM_CUBICLE',
              priority: b.priority || 'WARM',
              tags: b.tags || [],
              followups: b.followups || [],
            });
          }
        });
        leads = Array.from(mergedMap.values());
        saveStoredLeads(leads);
      }
    } catch {
      // Backend offline or unreachable — seamlessly use local cache
    }

    // Filter by productCategory
    if (category && category !== 'ALL') {
      leads = leads.filter((l) => l.productCategory === category);
    }

    // Filter by status
    if (status && status !== 'ALL') {
      leads = leads.filter((l) => l.status === status);
    }

    // Filter by priority
    if (priority && priority !== 'ALL') {
      leads = leads.filter((l) => l.priority === priority);
    }

    // Filter by source
    if (source && source !== 'ALL') {
      leads = leads.filter((l) => l.source === source);
    }

    // Filter by search
    if (search && search.trim()) {
      const q = search.toLowerCase();
      leads = leads.filter(
        (l) =>
          l.firstName.toLowerCase().includes(q) ||
          (l.lastName && l.lastName.toLowerCase().includes(q)) ||
          (l.company && l.company.toLowerCase().includes(q)) ||
          (l.email && l.email.toLowerCase().includes(q)) ||
          (l.phone && l.phone.toLowerCase().includes(q)) ||
          (l.city && l.city.toLowerCase().includes(q)) ||
          (l.leadNumber && l.leadNumber.toLowerCase().includes(q)) ||
          (l.quotationNumber && l.quotationNumber.toLowerCase().includes(q)) ||
          (l.tags && l.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }

    // Filter by Followup Schedule
    if (dueFilter !== 'ALL') {
      const now = new Date().getTime();
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      const endOfTodayTime = endOfToday.getTime();

      leads = leads.filter((l) => {
        if (!l.nextFollowupDate) return false;
        const dueTime = new Date(l.nextFollowupDate).getTime();
        if (dueFilter === 'OVERDUE') return dueTime < now;
        if (dueFilter === 'TODAY') return dueTime >= now && dueTime <= endOfTodayTime;
        if (dueFilter === 'UPCOMING') return dueTime > endOfTodayTime;
        return true;
      });
    }

    // Sort by latest created/updated
    leads.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());

    const total = leads.length;
    const startIndex = (page - 1) * limit;
    const items = leads.slice(startIndex, startIndex + limit);

    return {
      success: true,
      data: {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  },

  /**
   * Get single lead by ID
   */
  async getById(id: string): Promise<ApiResponse<Lead>> {
    const leads = getStoredLeads();
    const lead = leads.find((l) => l.id === id);
    if (!lead) {
      throw new Error('Lead not found');
    }
    return { success: true, data: lead };
  },

  /**
   * Create a new Lead with automatic sequential code
   */
  async create(data: Partial<Lead>): Promise<ApiResponse<Lead>> {
    const leads = getStoredLeads();
    const nextSeq = leads.length + 1;
    const leadNumber = `LEAD-2026-${String(nextSeq).padStart(3, '0')}`;

    const newLead: Lead = {
      id: `lead-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      leadNumber,
      firstName: data.firstName || 'New',
      lastName: data.lastName || '',
      email: data.email || '',
      phone: data.phone || '',
      company: data.company || '',
      city: data.city || '',
      address: data.address || '',
      clientType: data.clientType || 'CONTRACTOR',
      productCategory: data.productCategory || 'RESTROOM_CUBICLE',
      cubicleSpecs: data.cubicleSpecs,
      lockerSpecs: data.lockerSpecs,
      urinalSpecs: data.urinalSpecs,
      estimatedQuantity: Number(data.estimatedQuantity) || 1,
      estimatedValue: Number(data.estimatedValue) || 0,
      source: data.source || 'DIRECT_CALL',
      status: data.status || 'NEW',
      priority: data.priority || 'WARM',
      assignedTo: data.assignedTo || 'Sales Executive',
      message: data.message || '',
      notes: data.notes || '',
      tags: data.tags || [],
      followups: [],
      followupCount: 0,
      nextFollowupDate: data.nextFollowupDate || new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    leads.unshift(newLead);
    saveStoredLeads(leads);

    // Sync to backend if available
    try {
      await apiClient.post('/leads', newLead);
    } catch {}

    return { success: true, data: newLead };
  },

  /**
   * Update lead properties
   */
  async update(id: string, data: Partial<Lead>): Promise<ApiResponse<Lead>> {
    const leads = getStoredLeads();
    const idx = leads.findIndex((l) => l.id === id);
    if (idx === -1) throw new Error('Lead not found');

    const updatedLead: Lead = {
      ...leads[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };

    leads[idx] = updatedLead;
    saveStoredLeads(leads);

    // Sync to backend if available
    try {
      await apiClient.patch(`/leads/${id}`, data);
    } catch {}

    return { success: true, data: updatedLead };
  },

  /**
   * Delete lead permanently by ID or leadNumber
   */
  async delete(id: string): Promise<ApiResponse<{ success: boolean }>> {
    let leads = getStoredLeads();
    leads = leads.filter((l) => l.id !== id && l.leadNumber !== id);
    saveStoredLeads(leads);

    try {
      await apiClient.delete(`/leads/${id}`);
    } catch {}

    return { success: true, data: { success: true } };
  },

  /**
   * Purge all legacy dummy/seed leads from storage completely
   */
  async purgeDummyLeads(): Promise<ApiResponse<{ purgedCount: number }>> {
    let purgedCount = 0;
    if (typeof window !== 'undefined') {
      // 1. Purge from current storage
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter((l: Lead) => !isDummyLead(l));
            purgedCount += parsed.length - cleaned.length;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
          }
        } catch {}
      }

      // 2. Wipe any legacy keys completely
      for (const legacyKey of LEGACY_STORAGE_KEYS) {
        const legacyRaw = localStorage.getItem(legacyKey);
        if (legacyRaw) {
          try {
            const parsed = JSON.parse(legacyRaw);
            if (Array.isArray(parsed)) {
              const genuineLeads = parsed.filter((l: Lead) => !isDummyLead(l));
              purgedCount += parsed.length - genuineLeads.length;
              if (genuineLeads.length > 0) {
                const currentLeads = getStoredLeads();
                const mergedMap = new Map<string, Lead>();
                currentLeads.forEach((l) => mergedMap.set(l.id, l));
                genuineLeads.forEach((g) => mergedMap.set(g.id, g));
                saveStoredLeads(Array.from(mergedMap.values()));
              }
            }
          } catch {}
          localStorage.removeItem(legacyKey);
        }
      }
    }
    return { success: true, data: { purgedCount } };
  },

  /**
   * Clear all leads from local storage
   */
  async clearAll(): Promise<ApiResponse<{ success: boolean }>> {
    saveStoredLeads([]);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      for (const legacyKey of LEGACY_STORAGE_KEYS) {
        localStorage.removeItem(legacyKey);
      }
    }
    return { success: true, data: { success: true } };
  },

  /**
   * Add a follow-up record to the lead
   */
  async addFollowup(
    leadId: string,
    data: {
      channel: LeadFollowupChannel;
      status?: 'COMPLETED' | 'SCHEDULED' | 'PENDING';
      outcome?: string;
      discussionNotes: string;
      nextFollowupDate?: string | null;
      nextFollowupTime?: string | null;
      contactPerson?: string;
      contactPhone?: string;
      performedByName?: string;
      updateLeadStatus?: LeadStatus;
    }
  ): Promise<ApiResponse<{ lead: Lead; followup: LeadFollowup }>> {
    const leads = getStoredLeads();
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) throw new Error('Lead not found');

    const newFollowup: LeadFollowup = {
      id: `fup-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      leadId,
      channel: data.channel,
      status: data.status || 'COMPLETED',
      outcome: data.outcome,
      discussionNotes: data.discussionNotes,
      nextFollowupDate: data.nextFollowupDate,
      nextFollowupTime: data.nextFollowupTime,
      contactPerson: data.contactPerson || `${lead.firstName} ${lead.lastName || ''}`.trim(),
      contactPhone: data.contactPhone || lead.phone,
      performedByName: data.performedByName || 'Sales Executive',
      createdAt: new Date().toISOString(),
    };

    const currentFollowups = lead.followups || [];
    currentFollowups.unshift(newFollowup);

    lead.followups = currentFollowups;
    lead.followupCount = currentFollowups.length;
    lead.lastFollowupDate = newFollowup.createdAt;
    if (data.nextFollowupDate) {
      lead.nextFollowupDate = data.nextFollowupDate;
    }
    if (data.updateLeadStatus) {
      lead.status = data.updateLeadStatus;
    }
    lead.updatedAt = new Date().toISOString();

    saveStoredLeads(leads);

    return {
      success: true,
      data: {
        lead,
        followup: newFollowup,
      },
    };
  },

  /**
   * Quick-generate a formal Sales Quotation from a Lead and link it automatically!
   */
  async generateQuotation(options: GenerateQuotationOptions): Promise<ApiResponse<{ quotation: any; lead: Lead }>> {
    const leads = getStoredLeads();
    const lead = leads.find((l) => l.id === options.leadId);
    if (!lead) throw new Error('Lead not found');

    const qty = Number(lead.estimatedQuantity) || 1;
    let rate = Number(options.ratePerUnit);
    let itemDescription = '';
    let categoryTitle = '';

    // Calculate default pricing & narrative based on product category
    if (lead.productCategory === 'RESTROOM_CUBICLE') {
      rate = rate || 9500;
      categoryTitle = 'Quotation for Supply & Installation of Pacific Restroom Cubicles';
      itemDescription = `Supply & Installation of Restroom Cubicles (${lead.cubicleSpecs?.cubicleModel || 'Pacific Classic'}) manufactured using ${lead.cubicleSpecs?.boardThickness || '12mm'} ${lead.cubicleSpecs?.boardType || 'Compact HPL'} with ${lead.cubicleSpecs?.hardwarePackage || 'SS 304 Premium'} Hardware Package. Color/Finish: ${lead.cubicleSpecs?.colorPreference || 'Teak Woodgrain'}.`;
    } else if (lead.productCategory === 'LOCKER_SYSTEM') {
      rate = rate || 6500;
      categoryTitle = 'Quotation for Heavy Duty Pacific HPL Locker Systems';
      itemDescription = `Supply & Erection of Pacific Modular ${lead.lockerSpecs?.lockerTiers || '2-Tier'} Lockers with ${lead.lockerSpecs?.lockType || 'Digital Combination Lock'}. Built from ${lead.lockerSpecs?.material || '12mm Compact Phenolic'} with integrated ventilation.`;
    } else if (lead.productCategory === 'URINAL_PARTITION') {
      rate = rate || 3500;
      categoryTitle = 'Quotation for Pacific Privacy Urinal Modesty Screens';
      itemDescription = `Supply & Fixing of Urinal Modesty Screens (${lead.urinalSpecs?.screenDimensions || '450 x 900 mm'}) in ${lead.urinalSpecs?.boardType || '12mm Compact Laminate'} with ${lead.urinalSpecs?.mountingType || 'SS 304 Wall Clamps & Support'}.`;
    } else {
      rate = rate || 12000;
      categoryTitle = 'Quotation for Turnkey Commercial Washroom Package (Cubicles, Lockers & Urinal Dividers)';
      itemDescription = `Complete Turnkey Package: Restroom Cubicles (${lead.cubicleSpecs?.doorsCount || 10} Nos), Lockers (${lead.lockerSpecs?.compartmentsCount || 12} Nos), and Urinal Screens (${lead.urinalSpecs?.screensCount || 6} Nos) with premium architectural fittings.`;
    }

    const basicPrice = qty * rate;
    const installationCharge = options.installationPerUnit !== undefined ? qty * options.installationPerUnit : qty * 500;
    const subtotal = basicPrice + installationCharge;
    const gstAmount = Math.round(subtotal * 0.18);
    const grandTotal = subtotal + gstAmount;

    // Generate quotation reference: PPS/D/26-27/{seq}
    const quoteSeq = Math.floor(820 + Math.random() * 80);
    const quotationRef = `PPS/D/26-27/${quoteSeq}`;

    const categoryLabel = (lead.productCategory || 'RESTROOM_CUBICLE').replace('_', ' ');

    const quotationPayload = {
      referenceNumber: quotationRef,
      title: categoryTitle,
      recipientName: `${lead.firstName} ${lead.lastName || ''}`.trim(),
      recipientCompany: lead.company || 'Direct Client',
      recipientEmail: lead.email,
      recipientPhone: lead.phone,
      recipientAddress: lead.address || lead.city,
      projectName: `${lead.company || lead.firstName} - ${lead.city || 'Site'} (${categoryLabel})`,
      subject: `Quotation for ${categoryLabel} Requirements`,
      basicPrice,
      installationCharge,
      freightTerms: options.freightTerms || 'Extra as Actual / To Pay',
      grandTotal,
      currency: 'INR',
      status: 'SENT',
      items: [
        {
          serialNumber: 1,
          description: itemDescription,
          quantity: qty,
          unit: 'NOS',
          rate,
          amount: basicPrice,
        },
      ],
    };

    let quotationId = `quote-${Date.now()}`;

    // Try posting to salesQuotationsApi backend if alive
    try {
      const res = await salesQuotationsApi.create(quotationPayload);
      if (res.data?.data?.id) {
        quotationId = res.data.data.id;
      }
    } catch {
      // Store locally if backend is unavailable
    }

    // Link Quotation details back to the Lead!
    lead.quotationId = quotationId;
    lead.quotationNumber = quotationRef;
    lead.quotationAmount = grandTotal;
    lead.quotationDate = new Date().toISOString();
    lead.quotationStatus = 'SENT';
    lead.status = 'QUOTATION_SENT';
    lead.estimatedValue = grandTotal;

    // Auto-log a follow-up touchpoint for quotation dispatch!
    const quoteFollowup: LeadFollowup = {
      id: `fup-q-${Date.now()}`,
      leadId: lead.id,
      channel: 'EMAIL',
      status: 'COMPLETED',
      outcome: 'QUOTATION_GENERATED',
      discussionNotes: `Formal Quotation ${quotationRef} for ₹${grandTotal.toLocaleString('en-IN')} created and sent for ${categoryLabel} (${qty} units).`,
      contactPerson: `${lead.firstName} ${lead.lastName || ''}`.trim(),
      contactPhone: lead.phone,
      contactEmail: lead.email,
      performedByName: 'Sales Executive',
      createdAt: new Date().toISOString(),
      nextFollowupDate: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    };

    if (!lead.followups) lead.followups = [];
    lead.followups.unshift(quoteFollowup);
    lead.followupCount = lead.followups.length;
    lead.lastFollowupDate = quoteFollowup.createdAt;
    lead.nextFollowupDate = quoteFollowup.nextFollowupDate || undefined;
    lead.updatedAt = new Date().toISOString();

    saveStoredLeads(leads);

    return {
      success: true,
      data: {
        quotation: {
          id: quotationId,
          ...quotationPayload,
        },
        lead,
      },
    };
  },

  /**
   * Link an existing Quotation to a Lead
   */
  async linkExistingQuotation(
    leadId: string,
    quote: { id: string; referenceNumber: string; grandTotal?: number; status?: string }
  ): Promise<ApiResponse<Lead>> {
    const leads = getStoredLeads();
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) throw new Error('Lead not found');

    lead.quotationId = quote.id;
    lead.quotationNumber = quote.referenceNumber;
    if (quote.grandTotal) lead.quotationAmount = quote.grandTotal;
    lead.quotationStatus = quote.status || 'SENT';
    lead.quotationDate = new Date().toISOString();
    lead.status = 'QUOTATION_SENT';

    // Log follow-up
    const fup: LeadFollowup = {
      id: `fup-link-${Date.now()}`,
      leadId: lead.id,
      channel: 'WHATSAPP',
      status: 'COMPLETED',
      outcome: 'QUOTATION_LINKED',
      discussionNotes: `Existing Quotation ${quote.referenceNumber} linked to lead record.`,
      contactPerson: `${lead.firstName} ${lead.lastName || ''}`.trim(),
      performedByName: 'Sales Executive',
      createdAt: new Date().toISOString(),
    };
    if (!lead.followups) lead.followups = [];
    lead.followups.unshift(fup);
    lead.followupCount = lead.followups.length;
    lead.updatedAt = new Date().toISOString();

    saveStoredLeads(leads);
    return { success: true, data: lead };
  },

  /**
   * Get aggregate KPI metrics for dashboard cards
   */
  async getStats(): Promise<ApiResponse<LeadStatsSummary>> {
    const leads = getStoredLeads();
    const now = Date.now();
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const endOfTodayTime = endOfToday.getTime();

    let hotCount = 0;
    let interestedCount = 0;
    let quotedCount = 0;
    let wonCount = 0;
    let wonValue = 0;
    let pipelineValue = 0;
    let overdueFollowups = 0;
    let dueTodayFollowups = 0;

    const byCategory = {
      cubicle: 0,
      locker: 0,
      urinal: 0,
      combo: 0,
    };

    leads.forEach((l) => {
      if (l.priority === 'HOT') hotCount++;
      if (l.status === 'INTERESTED') interestedCount++;
      if (l.status === 'QUOTATION_SENT' || l.quotationNumber) quotedCount++;
      if (l.status === 'WON') {
        wonCount++;
        wonValue += Number(l.estimatedValue) || Number(l.quotationAmount) || 0;
      } else if (l.status !== 'LOST' && l.status !== 'INACTIVE') {
        pipelineValue += Number(l.estimatedValue) || Number(l.quotationAmount) || 0;
      }

      if (l.productCategory === 'RESTROOM_CUBICLE') byCategory.cubicle++;
      else if (l.productCategory === 'LOCKER_SYSTEM') byCategory.locker++;
      else if (l.productCategory === 'URINAL_PARTITION') byCategory.urinal++;
      else if (l.productCategory === 'COMBO_WASHROOM') byCategory.combo++;

      if (l.nextFollowupDate && l.status !== 'WON' && l.status !== 'LOST') {
        const due = new Date(l.nextFollowupDate).getTime();
        if (due < now) overdueFollowups++;
        else if (due <= endOfTodayTime) dueTodayFollowups++;
      }
    });

    return {
      success: true,
      data: {
        total: leads.length,
        hotCount,
        interestedCount,
        quotedCount,
        wonCount,
        wonValue,
        pipelineValue,
        overdueFollowups,
        dueTodayFollowups,
        byCategory,
      },
    };
  },
};
