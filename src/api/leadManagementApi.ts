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

const STORAGE_KEY = 'pacific_lead_management_store_v1';

// Initial Rich Sample Leads for Pacific Restroom Cubicle, Locker & Urinal Systems
const INITIAL_LEADS: Lead[] = [
  {
    id: 'lead-001',
    leadNumber: 'LEAD-2026-001',
    firstName: 'Rohit',
    lastName: 'Sharma',
    email: 'rohit.sharma@dlf.in',
    phone: '+91 98112 34567',
    company: 'DLF CyberCity Developers Ltd',
    city: 'Gurgaon, Haryana',
    address: 'DLF Cyber Park, Tower B, Phase 2, Sector 20',
    clientType: 'CORPORATE_CLIENT',
    productCategory: 'RESTROOM_CUBICLE',
    cubicleSpecs: {
      doorsCount: 18,
      cubicleModel: 'Pacific Classic Floor-Mounted',
      boardThickness: '12mm',
      boardType: 'Compact HPL (Phenolic)',
      hardwarePackage: 'SS 304 Premium Brush Finish',
      colorPreference: 'Natural Teak Woodgrain',
    },
    estimatedQuantity: 18,
    estimatedValue: 171000,
    source: 'DIRECT_CALL',
    status: 'INTERESTED',
    priority: 'HOT',
    assignedTo: 'Vikram Singh (North Sales)',
    message: 'Urgent requirement for Executive Washrooms on 4th floor. Needs samples of 12mm teak compact board.',
    notes: 'Architect finalized SS 304 hardware. Very interested in Pacific cubicles; awaiting commercial proposal.',
    tags: ['Gurgaon', 'DLF', 'Restroom Cubicles', '12mm Compact', 'SS304'],
    lastFollowupDate: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    nextFollowupDate: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
    followupCount: 2,
    followups: [
      {
        id: 'fup-001-1',
        leadId: 'lead-001',
        channel: 'PHONE_CALL',
        status: 'COMPLETED',
        outcome: 'REQUIREMENTS_DISCUSSED',
        discussionNotes: 'Initial requirement discussion with Project Head Rohit Sharma. Discussed 18 doors 12mm HPL.',
        contactPerson: 'Rohit Sharma',
        contactPhone: '+91 98112 34567',
        performedByName: 'Vikram Singh',
        createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      },
      {
        id: 'fup-001-2',
        leadId: 'lead-001',
        channel: 'SITE_VISIT',
        status: 'COMPLETED',
        outcome: 'INTEREST_CONFIRMED',
        discussionNotes: 'Site visit completed at Cyber Park. Site measurements verified. Client requested formal quotation with SS304 fittings.',
        contactPerson: 'Rohit Sharma & Architect Dave',
        contactPhone: '+91 98112 34567',
        performedByName: 'Vikram Singh',
        createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
        nextFollowupDate: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
      },
    ],
    createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
  },
  {
    id: 'lead-002',
    leadNumber: 'LEAD-2026-002',
    firstName: 'Ananya',
    lastName: 'Verma',
    email: 'ananya.v@cultfit.in',
    phone: '+91 98765 43210',
    company: 'Curefit / Cult.fit Healthcare',
    city: 'Noida, Uttar Pradesh',
    address: 'Cult Center, Sector 62, Near Electronic City Metro',
    clientType: 'CORPORATE_CLIENT',
    productCategory: 'LOCKER_SYSTEM',
    lockerSpecs: {
      lockerTiers: '2-Tier Heavy Duty',
      compartmentsCount: 36,
      lockType: 'Digital Number Code Lock',
      material: '12mm Compact HPL Moisture Proof',
      ventilationType: 'Laser Cut Slits',
    },
    estimatedQuantity: 36,
    estimatedValue: 234000,
    source: 'WEBSITE',
    status: 'QUOTATION_SENT',
    priority: 'WARM',
    assignedTo: 'Neha Gupta (Key Accounts)',
    message: 'Looking for 36 locker compartments for member changing rooms. Moisture resistant material mandatory.',
    notes: 'Quotation PPS/D/26-27/804 sent. Customer comparing with local metal lockers.',
    tags: ['Cult.fit', 'Lockers', 'Digital Lock', 'Gym Changing Room'],
    quotationId: 'quote-seed-804',
    quotationNumber: 'PPS/D/26-27/804',
    quotationAmount: 234000,
    quotationDate: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
    quotationStatus: 'SENT',
    lastFollowupDate: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
    nextFollowupDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    followupCount: 2,
    followups: [
      {
        id: 'fup-002-1',
        leadId: 'lead-002',
        channel: 'WHATSAPP',
        status: 'COMPLETED',
        outcome: 'SPECS_RECEIVED',
        discussionNotes: 'Shared Locker catalog via WhatsApp. Client selected 2-Tier with digital combination locks.',
        contactPerson: 'Ananya Verma',
        contactPhone: '+91 98765 43210',
        performedByName: 'Neha Gupta',
        createdAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
      },
      {
        id: 'fup-002-2',
        leadId: 'lead-002',
        channel: 'EMAIL',
        status: 'COMPLETED',
        outcome: 'QUOTATION_SENT',
        discussionNotes: 'Formal quotation PPS/D/26-27/804 sent via email with Locker drawing & 3D render.',
        contactPerson: 'Ananya Verma',
        contactEmail: 'ananya.v@cultfit.in',
        performedByName: 'Neha Gupta',
        createdAt: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
        nextFollowupDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      },
    ],
    createdAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
  },
  {
    id: 'lead-003',
    leadNumber: 'LEAD-2026-003',
    firstName: 'Rajesh',
    lastName: 'Nair',
    email: 'rajesh.nair@shapoorji.com',
    phone: '+91 97412 88990',
    company: 'Shapoorji Pallonji & Co',
    city: 'Bengaluru, Karnataka',
    address: 'Phoenix Mall of Asia, Hebbal Project Site',
    clientType: 'CONTRACTOR',
    productCategory: 'URINAL_PARTITION',
    urinalSpecs: {
      screensCount: 16,
      screenDimensions: '450 x 900 mm',
      mountingType: 'Wall-hung with SS Brackets & Support Leg',
      boardType: '12mm Compact Laminate (Merino Solid Charcoal)',
    },
    estimatedQuantity: 16,
    estimatedValue: 56000,
    source: 'ARCHITECT_SPEC',
    status: 'REQUIREMENT_GATHERED',
    priority: 'HOT',
    assignedTo: 'Karthik R (South Region)',
    message: 'Tender BOQ requires 16 Urinal privacy screens with CNC round corners for commercial mall washrooms.',
    notes: 'Drawings received. Client is requesting quote by end of week.',
    tags: ['Bangalore', 'Shapoorji', 'Urinal Partitions', 'Phoenix Mall'],
    lastFollowupDate: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    nextFollowupDate: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
    followupCount: 1,
    followups: [
      {
        id: 'fup-003-1',
        leadId: 'lead-003',
        channel: 'PHONE_CALL',
        status: 'COMPLETED',
        outcome: 'BOQ_RECEIVED',
        discussionNotes: 'Spoke with MEP Manager Rajesh Nair. Confirmed 450x900mm size with SS clamp brackets.',
        contactPerson: 'Rajesh Nair',
        contactPhone: '+91 97412 88990',
        performedByName: 'Karthik R',
        createdAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
      },
    ],
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
  },
  {
    id: 'lead-004',
    leadNumber: 'LEAD-2026-004',
    firstName: 'Dr. Vikram',
    lastName: 'Malhotra',
    email: 'v.malhotra@maxhealthcare.com',
    phone: '+91 98100 11223',
    company: 'Max Healthcare Institute Ltd',
    city: 'New Delhi',
    address: 'Max Super Speciality Hospital, Press Enclave Road, Saket',
    clientType: 'CORPORATE_CLIENT',
    productCategory: 'COMBO_WASHROOM',
    cubicleSpecs: {
      doorsCount: 24,
      cubicleModel: 'Pacific Hospital Grade Antibacterial',
      boardThickness: '12mm',
      boardType: 'Compact HPL (Antimicrobial Grade)',
      hardwarePackage: 'Nylon Black Matt Antibacterial',
      colorPreference: 'Frost Grey & Medical Blue',
    },
    lockerSpecs: {
      lockerTiers: '3-Tier Staff Locker',
      compartmentsCount: 18,
      lockType: 'RFID Smart Card Lock',
      material: '12mm Compact HPL',
    },
    urinalSpecs: {
      screensCount: 12,
      screenDimensions: '450 x 900 mm',
      mountingType: 'Wall-hung with SS Brackets',
      boardType: '12mm Compact Laminate',
    },
    estimatedQuantity: 54,
    estimatedValue: 412000,
    source: 'REFERRAL',
    status: 'NEW',
    priority: 'HOT',
    assignedTo: 'Vikram Singh (North Sales)',
    message: 'Complete renovation of OPD and Emergency block washrooms. Requires cubicles, staff lockers, and urinal dividers.',
    notes: 'High-value turnkey inquiry. Need antimicrobial certified boards.',
    tags: ['Turnkey', 'Max Hospital', 'Hospital Washroom', 'Combo Pack'],
    lastFollowupDate: undefined,
    nextFollowupDate: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
    followupCount: 0,
    followups: [],
    createdAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
  },
  {
    id: 'lead-005',
    leadNumber: 'LEAD-2026-005',
    firstName: 'Ar. Tanvi',
    lastName: 'Kulkarni',
    email: 'tanvi@studioarch.co.in',
    phone: '+91 99201 55443',
    company: 'Studio Arch Design Consultants',
    city: 'Mumbai, Maharashtra',
    address: 'Bandra-Kurla Complex (BKC), Commercial Tower 4',
    clientType: 'ARCHITECT',
    productCategory: 'RESTROOM_CUBICLE',
    cubicleSpecs: {
      doorsCount: 14,
      cubicleModel: 'Pacific Designer Premium Suspended',
      boardThickness: '18mm',
      boardType: 'Boilo / HDHMR High Moisture Resistant',
      hardwarePackage: 'Shoe Box Aluminium Anodized',
      colorPreference: 'Charcoal Grey Matte',
    },
    estimatedQuantity: 14,
    estimatedValue: 148000,
    source: 'CONFIGURATOR',
    status: 'NEGOTIATING',
    priority: 'HOT',
    assignedTo: 'Siddharth M (West Region)',
    message: 'Submitted 3D configurator design for BKC office renovation. Client liked 18mm Boilo with shoe-box profile.',
    notes: 'Quotation PPS/D/26-27/798 sent. Negotiating final discount on installation charges.',
    tags: ['Mumbai', 'BKC', '18mm Boilo', 'Architect', 'Configurator'],
    quotationId: 'quote-seed-798',
    quotationNumber: 'PPS/D/26-27/798',
    quotationAmount: 148000,
    quotationDate: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    quotationStatus: 'SENT',
    lastFollowupDate: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    nextFollowupDate: new Date(Date.now() + 18 * 3600 * 1000).toISOString(),
    followupCount: 3,
    followups: [
      {
        id: 'fup-005-1',
        leadId: 'lead-005',
        channel: 'PHONE_CALL',
        status: 'COMPLETED',
        outcome: 'SPECS_CONFIRMED',
        discussionNotes: 'Discussed configurator draft. Agreed on 18mm HDHMR with anodized shoe box channel.',
        contactPerson: 'Ar. Tanvi',
        contactPhone: '+91 99201 55443',
        performedByName: 'Siddharth M',
        createdAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
      },
      {
        id: 'fup-005-2',
        leadId: 'lead-005',
        channel: 'EMAIL',
        status: 'COMPLETED',
        outcome: 'QUOTATION_SENT',
        discussionNotes: 'Formal quotation PPS/D/26-27/798 sent for ₹1,48,000.',
        contactPerson: 'Ar. Tanvi',
        contactEmail: 'tanvi@studioarch.co.in',
        performedByName: 'Siddharth M',
        createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      },
      {
        id: 'fup-005-3',
        channel: 'WHATSAPP',
        status: 'COMPLETED',
        outcome: 'PRICE_NEGOTIATION',
        discussionNotes: 'Client asked for 5% special project rebate on installation. Under review by Sales Director.',
        contactPerson: 'Ar. Tanvi',
        contactPhone: '+91 99201 55443',
        performedByName: 'Siddharth M',
        createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
        leadId: 'lead-005',
      },
    ],
    createdAt: new Date(Date.now() - 96 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
  },
  {
    id: 'lead-006',
    leadNumber: 'LEAD-2026-006',
    firstName: 'Amitabh',
    lastName: 'Roy',
    email: 'amitabh.roy@itclimited.in',
    phone: '+91 98300 77665',
    company: 'ITC Infotech Park',
    city: 'Kolkata, West Bengal',
    address: 'Rajarhat, Action Area II, New Town',
    clientType: 'CORPORATE_CLIENT',
    productCategory: 'RESTROOM_CUBICLE',
    cubicleSpecs: {
      doorsCount: 30,
      cubicleModel: 'Pacific Floor Anchored SS304',
      boardThickness: '12mm',
      boardType: 'Compact Merino Phenolic',
      hardwarePackage: 'SS 304 Premium',
      colorPreference: 'Frost White',
    },
    estimatedQuantity: 30,
    estimatedValue: 285000,
    source: 'EXHIBITION',
    status: 'WON',
    priority: 'HOT',
    assignedTo: 'Vikram Singh (North Sales)',
    message: 'Finalized order for 30 Cubicles at Kolkata facility. Converted to Sales Order.',
    notes: 'Converted to Sales Order PPS/ORD/26-27/412. Advance 50% received.',
    tags: ['Kolkata', 'ITC', 'Won', 'Order Converted'],
    quotationId: 'quote-seed-762',
    quotationNumber: 'PPS/D/26-27/762',
    quotationAmount: 285000,
    quotationDate: new Date(Date.now() - 120 * 3600 * 1000).toISOString(),
    quotationStatus: 'ACCEPTED',
    lastFollowupDate: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    nextFollowupDate: undefined,
    followupCount: 4,
    followups: [],
    createdAt: new Date(Date.now() - 140 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
];

// Helper to get local leads from localStorage or seed
function getStoredLeads(): Lead[] {
  if (typeof window === 'undefined') return INITIAL_LEADS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[leadManagementApi] Failed to parse stored leads, using seed:', err);
  }
  // Initialize storage
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_LEADS));
  } catch {}
  return INITIAL_LEADS;
}

function saveStoredLeads(leads: Lead[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
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
        // Merge with our rich local specs
        const backendItems = backendRes.data.data.items;
        const mergedMap = new Map<string, Lead>();
        leads.forEach((l) => mergedMap.set(l.id, l));
        backendItems.forEach((b) => {
          if (!mergedMap.has(b.id)) {
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
   * Delete lead
   */
  async delete(id: string): Promise<ApiResponse<{ success: boolean }>> {
    let leads = getStoredLeads();
    leads = leads.filter((l) => l.id !== id);
    saveStoredLeads(leads);

    try {
      await apiClient.delete(`/leads/${id}`);
    } catch {}

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
