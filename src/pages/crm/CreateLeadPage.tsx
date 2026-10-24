import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Building2,
  Phone,
  Mail,
  MapPin,
  Layers,
  Lock,
  Columns,
  Sparkles,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  Flame,
  User,
  Tag,
  Briefcase,
  FileText,
  Plus,
  Trash2,
  Search,
  Sliders,
} from 'lucide-react';
import { leadManagementApi } from '../../api/leadManagementApi';
import { productCatalogApi } from '../../api/productCatalogApi';
import type {
  LeadProductCategory,
  LeadClientType,
  LeadPriority,
  LeadSource,
  LeadItem,
  ProductCatalogModel,
} from '../../types/admin';

const PRODUCT_CATEGORIES: {
  id: LeadProductCategory;
  name: string;
  icon: React.ElementType;
  badge: string;
  desc: string;
}[] = [
  {
    id: 'RESTROOM_CUBICLE',
    name: 'Toilet Cubicles',
    icon: Layers,
    badge: '12mm / 18mm HPL',
    desc: 'High pressure compact laminate modular doors with SS 304 or Nylon architectural hardware',
  },
  {
    id: 'LOCKER_SYSTEM',
    name: 'Locker Systems',
    icon: Lock,
    badge: '1–4 Tier Modular',
    desc: 'Moisture-proof phenolic lockers for corporate offices, gyms, healthcare & industries',
  },
  {
    id: 'URINAL_PARTITION',
    name: 'Urinal Partitions',
    icon: Columns,
    badge: 'Modesty Divider',
    desc: 'Privacy modesty divider panels in 12mm compact laminate with SS wall brackets',
  },
  {
    id: 'COMBO_WASHROOM',
    name: 'Turnkey Washroom Combo',
    icon: Sparkles,
    badge: 'Integrated Solution',
    desc: 'Complete washroom package combining cubicles, modesty panels & staff lockers',
  },
];

export function createDefaultLeadItem(category: LeadProductCategory = 'RESTROOM_CUBICLE', customTitle?: string): LeadItem {
  if (category === 'RESTROOM_CUBICLE') {
    return {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      category: 'RESTROOM_CUBICLE',
      productName: customTitle || 'Restroom Cubicles',
      model: 'Pacific Classic Floor-Mounted',
      quantity: 10,
      unit: 'Doors',
      boardThickness: '12mm',
      boardType: 'Compact HPL (Phenolic)',
      hardwarePackage: 'SS 304 Premium Brush Finish',
      colorPreference: 'Natural Teak Woodgrain',
      estimatedRate: 9500,
      estimatedAmount: 95000,
      specificationsNotes: 'Standard 12mm HPL with SS 304 hardware',
    };
  }
  if (category === 'LOCKER_SYSTEM') {
    return {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      category: 'LOCKER_SYSTEM',
      productName: customTitle || 'Modular Locker System',
      model: '2-Tier Heavy Duty',
      quantity: 24,
      unit: 'Compartments',
      boardThickness: '12mm',
      boardType: 'Compact HPL Moisture Proof',
      hardwarePackage: 'Digital Number Code Lock',
      colorPreference: 'Frost Grey & Charcoal',
      estimatedRate: 6500,
      estimatedAmount: 156000,
      specificationsNotes: '12mm phenolic lockers with ventilation',
    };
  }
  if (category === 'URINAL_PARTITION') {
    return {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      category: 'URINAL_PARTITION',
      productName: customTitle || 'Urinal Modesty Partitions',
      model: '450 x 900 mm Standard',
      quantity: 6,
      unit: 'Screens',
      boardThickness: '12mm',
      boardType: '12mm Compact Laminate',
      hardwarePackage: 'Wall-hung with SS Brackets & Support Leg',
      colorPreference: 'Frost Grey',
      estimatedRate: 3500,
      estimatedAmount: 21000,
      specificationsNotes: '450 x 900 mm modesty divider',
    };
  }
  return {
    id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    category: 'COMBO_WASHROOM',
    productName: customTitle || 'Kids Restroom Cubicles',
    model: 'Kids Child-Ergonomic 1200mm',
    quantity: 6,
    unit: 'Units',
    boardThickness: '12mm',
    boardType: 'Compact HPL (Phenolic)',
    hardwarePackage: 'Nylon Black Matt Safety Coin Release',
    colorPreference: 'Yellow & Blue Dual Tone',
    estimatedRate: 10500,
    estimatedAmount: 63000,
    specificationsNotes: 'Ergonomic height 1200-1500mm with anti-pinch gap',
  };
}

export default function CreateLeadPage() {
  const navigate = useNavigate();

  // Prospect & Company Info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [clientType, setClientType] = useState<LeadClientType>('CONTRACTOR');

  // Multiple Items State (One customer can order/inquire multiple products)
  const [items, setItems] = useState<LeadItem[]>([createDefaultLeadItem('RESTROOM_CUBICLE')]);
  const [catalogModels, setCatalogModels] = useState<ProductCatalogModel[]>([]);

  // Load catalog models on mount for search & quick pick
  useEffect(() => {
    productCatalogApi
      .listModels(undefined, true)
      .then((models) => {
        if (models && models.length > 0) {
          setCatalogModels(models);
        }
      })
      .catch(() => {});
  }, []);

  // Commercial & Pipeline
  const [estimatedValue, setEstimatedValue] = useState<string | number>('');
  const [priority, setPriority] = useState<LeadPriority>('HOT');
  const [source, setSource] = useState<LeadSource>('DIRECT_CALL');
  const [assignedTo, setAssignedTo] = useState('Vikram Singh (North Sales)');
  const [message, setMessage] = useState('');
  const [notes, setNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  // Follow-up Schedule
  const [nextFollowupDate, setNextFollowupDate] = useState(() => {
    const d = new Date(Date.now() + 24 * 3600 * 1000);
    return d.toISOString().split('T')[0];
  });
  const [nextFollowupTime, setNextFollowupTime] = useState('11:00');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Computed Totals across all requested items
  const totalUnits = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  const totalCalculatedAmount = items.reduce(
    (sum, it) => sum + (Number(it.estimatedAmount) || ((Number(it.quantity) || 0) * (Number(it.estimatedRate) || 0))),
    0
  );

  // Quick item manipulation helpers
  const handleAddItem = (category: LeadProductCategory, title?: string) => {
    setItems((prev) => [...prev, createDefaultLeadItem(category, title)]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      alert('A lead must have at least one product requirement.');
      return;
    }
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleUpdateItem = (id: string, updates: Partial<LeadItem>) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const merged = { ...it, ...updates };
        const q = Number(merged.quantity) || 0;
        const r = Number(merged.estimatedRate) || 0;
        if (updates.quantity !== undefined || updates.estimatedRate !== undefined) {
          merged.estimatedAmount = q * r;
        }
        return merged;
      })
    );
  };

  // Quick follow-up presets
  const handleSetPresetFollowup = (hours: number) => {
    const target = new Date(Date.now() + hours * 3600 * 1000);
    setNextFollowupDate(target.toISOString().split('T')[0]);
    const hh = String(target.getHours()).padStart(2, '0');
    const mm = String(target.getMinutes()).padStart(2, '0');
    setNextFollowupTime(`${hh}:${mm}`);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent, generateQuoteImmediate: boolean = false) => {
    e.preventDefault();
    if (!firstName.trim()) {
      setError('Contact Person First Name is required.');
      return;
    }
    if (!phone.trim()) {
      setError('Phone number is required for follow-up coordination.');
      return;
    }
    if (items.length === 0) {
      setError('Please add at least one product item to the customer inquiry.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const finalEstValue = Number(estimatedValue) || totalCalculatedAmount;

      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const followupDateTime = nextFollowupDate
        ? new Date(`${nextFollowupDate}T${nextFollowupTime || '11:00'}:00`).toISOString()
        : new Date(Date.now() + 24 * 3600 * 1000).toISOString();

      // Extract legacy specs from first matching items
      const firstCubicle = items.find((it) => it.category === 'RESTROOM_CUBICLE');
      const firstLocker = items.find((it) => it.category === 'LOCKER_SYSTEM');
      const firstUrinal = items.find((it) => it.category === 'URINAL_PARTITION');

      const primaryCategory = items.length > 1 ? 'COMBO_WASHROOM' : (items[0]?.category || 'RESTROOM_CUBICLE');

      const newLeadData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        company: company.trim(),
        city: city.trim(),
        address: address.trim(),
        clientType,
        productCategory: primaryCategory,
        items,
        cubicleSpecs: firstCubicle
          ? {
              doorsCount: firstCubicle.quantity,
              cubicleModel: firstCubicle.model,
              boardThickness: firstCubicle.boardThickness,
              boardType: firstCubicle.boardType,
              hardwarePackage: firstCubicle.hardwarePackage,
              colorPreference: firstCubicle.colorPreference,
            }
          : undefined,
        lockerSpecs: firstLocker
          ? {
              lockerTiers: firstLocker.model,
              compartmentsCount: firstLocker.quantity,
              lockType: firstLocker.hardwarePackage,
              material: firstLocker.boardType,
            }
          : undefined,
        urinalSpecs: firstUrinal
          ? {
              screensCount: firstUrinal.quantity,
              screenDimensions: firstUrinal.model,
              mountingType: firstUrinal.hardwarePackage,
              boardType: firstUrinal.boardType,
            }
          : undefined,
        estimatedQuantity: totalUnits,
        estimatedValue: finalEstValue,
        source,
        status: 'NEW' as const,
        priority,
        assignedTo,
        message: message.trim(),
        notes: notes.trim(),
        tags,
        nextFollowupDate: followupDateTime,
      };

      const res = await leadManagementApi.create(newLeadData);

      if (generateQuoteImmediate && res.data?.id) {
        // Auto-generate quotation right away and redirect to detail page
        await leadManagementApi.generateQuotation({ leadId: res.data.id });
        navigate(`/admin/dashboard/crm-leads/${res.data.id}`);
      } else if (res.data?.id) {
        navigate(`/admin/dashboard/crm-leads/${res.data.id}`);
      } else {
        navigate('/admin/dashboard/crm-leads');
      }
    } catch (err: any) {
      console.error('Failed to create lead:', err);
      setError(err?.message || 'Failed to create commercial lead. Please check details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1.5">
            <Link
              to="/admin/dashboard/crm-leads"
              className="hover:text-[#7FB706] transition flex items-center gap-1 min-h-[32px]"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Leads & Enquiries
            </Link>
            <span>/</span>
            <span className="text-[#7FB706] font-semibold">New Commercial Lead</span>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-[#7FB706]/10 text-[#7FB706] border border-[#7FB706]/30">
              <Building2 className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                New Commercial Lead
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Toilet Cubicles, Lockers & Urinal Partition Enquiries • Direct Quotation Linkage
              </p>
            </div>
          </div>
        </div>

        {/* Back Link Button for Mobile */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/admin/dashboard/crm-leads')}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10 transition flex items-center gap-1.5 min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" /> Cancel & Return
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
        {/* Step 1: Quick Add Product Categories */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#121029] border border-[#7FB706]/30 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#7FB706] flex items-center gap-1.5">
              <Layers className="w-4 h-4" /> 1. Quick Add Product Categories
            </span>
            <span className="text-[11px] text-gray-400 hidden sm:inline">
              Click any category below to add that product to this customer inquiry
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {PRODUCT_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const countForCat = items.filter((it) => it.category === cat.id).length;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleAddItem(cat.id)}
                  className={`p-4 rounded-xl border text-left transition relative flex flex-col justify-between min-h-[96px] ${
                    countForCat > 0
                      ? 'bg-[#7FB706]/15 border-[#7FB706] shadow-lg shadow-[#7FB706]/10'
                      : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className={`p-2 rounded-lg ${
                          countForCat > 0
                            ? 'bg-[#7FB706] text-black font-bold'
                            : 'bg-white/5 text-gray-400'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          countForCat > 0
                            ? 'bg-[#7FB706]/20 text-[#7FB706] border-[#7FB706]/40'
                            : 'bg-white/5 text-gray-400 border-white/10'
                        }`}
                      >
                        {countForCat > 0 ? `${countForCat} Added` : cat.badge}
                      </span>
                    </div>
                    <div className="font-bold text-white text-sm">{cat.name}</div>
                    <p className="text-[11px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                      {cat.desc}
                    </p>
                  </div>
                  <div className="text-[10px] font-semibold text-[#7FB706] mt-2 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add to Inquiry
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Prospect & Company Details */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#121029] border border-white/10 space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-[#7FB706] flex items-center gap-1.5">
            <User className="w-4 h-4" /> 2. Prospect & Company Information
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Contact Person First Name *
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Rohit"
                className="w-full bg-[#0d0b21] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Sharma"
                className="w-full bg-[#0d0b21] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Company / Firm / Site Name
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. DLF CyberCity Ltd"
                className="w-full bg-[#0d0b21] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Phone / Mobile Number *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-gray-500 absolute left-3 top-3.5" />
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98112 34567"
                  className="w-full bg-[#0d0b21] border border-white/10 rounded-xl pl-9 pr-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@company.com"
                  className="w-full bg-[#0d0b21] border border-white/10 rounded-xl pl-9 pr-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Client / Business Nature
              </label>
              <select
                value={clientType}
                onChange={(e) => setClientType(e.target.value as LeadClientType)}
                className="w-full bg-[#0d0b21] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
              >
                <option value="CONTRACTOR">Civil / Turnkey Contractor</option>
                <option value="ARCHITECT">Architect & Interior Designer</option>
                <option value="CORPORATE_CLIENT">Corporate Client / Direct End-User</option>
                <option value="BUILDER">Builder & Real Estate Developer</option>
                <option value="GOVERNMENT">Government / Institutional Dept</option>
                <option value="DEALER">Dealer / Regional Distributor</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Project Site City & State
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-gray-500 absolute left-3 top-3.5" />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Gurgaon, Haryana"
                  className="w-full bg-[#0d0b21] border border-white/10 rounded-xl pl-9 pr-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[44px]"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Site Delivery Address / Location
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Tower B, DLF Cyber Park, Sector 20, Phase 2"
                className="w-full bg-[#0d0b21] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[44px]"
              />
            </div>
          </div>
        </div>

        {/* Step 3: Customer Product Requirements (Multiple Items) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#121029] border border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#7FB706] flex items-center gap-1.5">
                <Briefcase className="w-4 h-4" /> 3. Customer Product Requirements &amp; Multiple Items ({items.length} Product{items.length > 1 ? 's' : ''})
              </span>
              <p className="text-[11px] text-gray-400 mt-0.5">
                One customer can order or search for multiple products (Cubicles, Lockers, Urinal Partitions, Kids Models) under a single enquiry.
              </p>
            </div>

            {/* Quick Summary Pill */}
            <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-mono">
              <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-300">
                <strong className="text-white">{totalUnits}</strong> Units Total
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-[#7FB706]/15 border border-[#7FB706]/30 text-[#7FB706] font-bold">
                ₹{totalCalculatedAmount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* List of Multiple Product Items */}
          <div className="space-y-4">
            {items.map((item, index) => {
              const itemTotal = Number(item.estimatedAmount) || ((Number(item.quantity) || 0) * (Number(item.estimatedRate) || 0));

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition space-y-3 relative group"
                >
                  {/* Item Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#7FB706] text-black font-extrabold text-[10px] font-mono">
                        ITEM #{index + 1}
                      </span>
                      <select
                        value={item.category}
                        onChange={(e) => {
                          const cat = e.target.value as LeadProductCategory;
                          const def = createDefaultLeadItem(cat);
                          handleUpdateItem(item.id, {
                            category: cat,
                            productName: def.productName,
                            model: def.model,
                            unit: def.unit,
                            boardThickness: def.boardThickness,
                            boardType: def.boardType,
                            hardwarePackage: def.hardwarePackage,
                            estimatedRate: def.estimatedRate,
                          });
                        }}
                        className="bg-[#0d0b21] border border-white/10 rounded-lg px-2.5 py-1 text-xs font-semibold text-white focus:outline-none focus:border-[#7FB706]"
                      >
                        <option value="RESTROOM_CUBICLE">Toilet Cubicles</option>
                        <option value="LOCKER_SYSTEM">Locker Systems</option>
                        <option value="URINAL_PARTITION">Urinal Partitions</option>
                        <option value="COMBO_WASHROOM">Kids Cubicle / Washroom Combo</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        ₹{itemTotal.toLocaleString('en-IN')}
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                          title="Remove this item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Catalog Model Dropdown Picker */}
                  {catalogModels.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-[11px] text-gray-400 flex items-center gap-1">
                        <Search className="w-3 h-3 text-[#7FB706]" /> Quick Pick Catalog Model:
                      </span>
                      <select
                        onChange={(e) => {
                          const slug = e.target.value;
                          const found = catalogModels.find((m) => m.slug === slug);
                          if (found) {
                            handleUpdateItem(item.id, {
                              productName: found.title,
                              model: found.title,
                              specificationsNotes: found.subtitle || found.description,
                              category:
                                found.category === 'Lockers'
                                  ? 'LOCKER_SYSTEM'
                                  : found.category === 'Urinal Partitions'
                                  ? 'URINAL_PARTITION'
                                  : found.category === 'Kids Toilet' || found.title.toLowerCase().includes('kids')
                                  ? 'KIDS_CUBICLE'
                                  : 'RESTROOM_CUBICLE',
                            });
                          }
                        }}
                        className="bg-[#0d0b21] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-gray-300 focus:outline-none focus:border-[#7FB706]"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Select from Pacific catalog...
                        </option>
                        <optgroup label="Standard Restroom Cubicles">
                          {catalogModels
                            .filter((m) => m.category === 'Cubicle' && !m.title.toLowerCase().includes('kids'))
                            .map((m) => (
                              <option key={m.slug} value={m.slug}>
                                {m.title}
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="Kids Cubicle Models">
                          {catalogModels
                            .filter((m) => m.category === 'Kids Toilet' || m.title.toLowerCase().includes('kids'))
                            .map((m) => (
                              <option key={m.slug} value={m.slug}>
                                {m.title}
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="Locker Systems">
                          {catalogModels
                            .filter((m) => m.category === 'Lockers')
                            .map((m) => (
                              <option key={m.slug} value={m.slug}>
                                {m.title}
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="Urinal Partitions">
                          {catalogModels
                            .filter((m) => m.category === 'Urinal Partitions')
                            .map((m) => (
                              <option key={m.slug} value={m.slug}>
                                {m.title}
                              </option>
                            ))}
                        </optgroup>
                      </select>
                    </div>
                  )}

                  {/* Item Details Form Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                        Product / Model Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={item.productName}
                        onChange={(e) => handleUpdateItem(item.id, { productName: e.target.value })}
                        placeholder="e.g. Pacific Classic Floor-Mounted"
                        className="w-full bg-[#0d0b21] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#7FB706] min-h-[38px]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                        Quantity &amp; Unit *
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="number"
                          min={1}
                          required
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(item.id, { quantity: Number(e.target.value) || 1 })}
                          className="w-20 bg-[#0d0b21] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#7FB706] font-mono min-h-[38px]"
                        />
                        <select
                          value={item.unit || 'Doors'}
                          onChange={(e) => handleUpdateItem(item.id, { unit: e.target.value })}
                          className="flex-1 bg-[#0d0b21] border border-white/10 rounded-xl px-2 py-2 text-white focus:outline-none focus:border-[#7FB706] min-h-[38px]"
                        >
                          <option value="Doors">Doors</option>
                          <option value="Screens">Screens</option>
                          <option value="Compartments">Compartments</option>
                          <option value="Units">Units</option>
                          <option value="Sets">Sets</option>
                          <option value="NOS">NOS</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                        Estimated Rate / Unit (₹)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={item.estimatedRate || ''}
                        onChange={(e) => handleUpdateItem(item.id, { estimatedRate: Number(e.target.value) || 0 })}
                        placeholder="9500"
                        className="w-full bg-[#0d0b21] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#7FB706] font-mono min-h-[38px]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                        Board Core &amp; Thickness
                      </label>
                      <select
                        value={`${item.boardThickness || '12mm'} ${item.boardType || 'Compact HPL'}`}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val.includes('12mm Compact HPL')) {
                            handleUpdateItem(item.id, { boardThickness: '12mm', boardType: 'Compact HPL (Phenolic)' });
                          } else if (val.includes('18mm Compact HPL')) {
                            handleUpdateItem(item.id, { boardThickness: '18mm', boardType: 'Compact HPL (Phenolic)' });
                          } else if (val.includes('12mm Boilo')) {
                            handleUpdateItem(item.id, { boardThickness: '12mm', boardType: 'Boilo / HDHMR Moisture Proof' });
                          } else {
                            handleUpdateItem(item.id, { boardThickness: '12mm', boardType: 'Compact Laminate' });
                          }
                        }}
                        className="w-full bg-[#0d0b21] border border-white/10 rounded-xl px-2 py-2 text-white focus:outline-none focus:border-[#7FB706] min-h-[38px]"
                      >
                        <option value="12mm Compact HPL">12mm Compact HPL (Solid Phenolic)</option>
                        <option value="18mm Compact HPL">18mm Compact HPL (Heavy Duty)</option>
                        <option value="12mm Boilo">12mm Boilo HDHMR Water Resistant</option>
                        <option value="12mm Compact Laminate">12mm Compact Laminate Standard</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                        Hardware Package
                      </label>
                      <select
                        value={item.hardwarePackage || 'SS 304 Premium Brush Finish'}
                        onChange={(e) => handleUpdateItem(item.id, { hardwarePackage: e.target.value })}
                        className="w-full bg-[#0d0b21] border border-white/10 rounded-xl px-2 py-2 text-white focus:outline-none focus:border-[#7FB706] min-h-[38px]"
                      >
                        <option value="SS 304 Premium Brush Finish">SS 304 Premium Brush Finish</option>
                        <option value="SS 316 Coastal Grade Heavy Duty">SS 316 Coastal Grade Heavy Duty</option>
                        <option value="Nylon Black Matt Antibacterial">Nylon Black Matt Antibacterial</option>
                        <option value="Shoe Box Aluminium Anodized">Shoe Box Aluminium Anodized</option>
                        <option value="Digital Number Code Lock">Digital Number Code Lock</option>
                        <option value="Wall-hung with SS Brackets & Support Leg">Wall-hung with SS Brackets & Support Leg</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                        Color / Finish Preference
                      </label>
                      <input
                        type="text"
                        value={item.colorPreference || ''}
                        onChange={(e) => handleUpdateItem(item.id, { colorPreference: e.target.value })}
                        placeholder="e.g. Natural Teak, Slate Grey, Walnut"
                        className="w-full bg-[#0d0b21] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#7FB706] min-h-[38px]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                        Technical Specs Notes / Special Dimensions
                      </label>
                      <input
                        type="text"
                        value={item.specificationsNotes || ''}
                        onChange={(e) => handleUpdateItem(item.id, { specificationsNotes: e.target.value })}
                        placeholder="e.g. Size 900x1200mm, Anti-pinch gap, master key override"
                        className="w-full bg-[#0d0b21] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#7FB706] min-h-[38px]"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Add Product Buttons Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-400 font-semibold mr-1">Add Another Product:</span>
              <button
                type="button"
                onClick={() => handleAddItem('RESTROOM_CUBICLE', 'Toilet Cubicles (Standard)')}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white font-medium flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5 text-[#7FB706]" /> + Toilet Cubicle
              </button>
              <button
                type="button"
                onClick={() => handleAddItem('URINAL_PARTITION', 'Urinal Privacy Partitions')}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white font-medium flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" /> + Urinal Partition
              </button>
              <button
                type="button"
                onClick={() => handleAddItem('LOCKER_SYSTEM', 'Modular Locker System')}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white font-medium flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5 text-sky-400" /> + Locker System
              </button>
              <button
                type="button"
                onClick={() => handleAddItem('COMBO_WASHROOM', 'Kids Restroom Cubicles')}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white font-medium flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5 text-purple-400" /> + Kids Cubicle
              </button>
              <button
                type="button"
                onClick={() => handleAddItem('RESTROOM_CUBICLE', 'Custom Architectural Solution')}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-300 font-medium flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" /> + Custom Item
              </button>
            </div>

            <div className="text-right text-xs font-mono font-bold text-[#7FB706]">
              Subtotal: ₹{totalCalculatedAmount.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Step 4: Commercial & Pipeline Sizing */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#121029] border border-white/10 space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-[#7FB706] flex items-center gap-1.5">
            <DollarSign className="w-4 h-4" /> 4. Commercial Valuation & Pipeline Status
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Estimated Deal Value (₹ INR)
              </label>
              <div className="relative">
                <span className="text-gray-400 absolute left-3 top-3 text-xs font-bold">₹</span>
                <input
                  type="number"
                  value={estimatedValue}
                  onChange={(e) => setEstimatedValue(e.target.value)}
                  placeholder="e.g. 150000"
                  className="w-full bg-[#0d0b21] border border-white/10 rounded-xl pl-8 pr-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Lead Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as LeadPriority)}
                className="w-full bg-[#0d0b21] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
              >
                <option value="HOT">🔥 HOT (Immediate closing / Urgent)</option>
                <option value="WARM">⚡ WARM (Interested / Active evaluation)</option>
                <option value="COLD">❄️ COLD (Initial inquiry / Future stage)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Lead Acquisition Source
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as LeadSource)}
                className="w-full bg-[#0d0b21] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
              >
                <option value="DIRECT_CALL">Direct Phone Call</option>
                <option value="WEBSITE">Pacific Corporate Website</option>
                <option value="WHATSAPP">WhatsApp Business Chat</option>
                <option value="REFERRAL">Client / Architect Referral</option>
                <option value="SITE_VISIT">Architect Site Visit</option>
                <option value="EXHIBITION">Trade Expo / Exhibition</option>
                <option value="OTHER">Other Source</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Assigned Sales Executive
              </label>
              <input
                type="text"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full bg-[#0d0b21] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
              />
            </div>
          </div>
        </div>

        {/* Step 5: Follow-up Scheduling & Scope Notes */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#121029] border border-white/10 space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-[#7FB706] flex items-center gap-1.5">
            <Clock className="w-4 h-4" /> 5. Follow-Up Schedule & Requirement Notes
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Next Follow-Up Date
              </label>
              <input
                type="date"
                value={nextFollowupDate}
                onChange={(e) => setNextFollowupDate(e.target.value)}
                className="w-full bg-[#0d0b21] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Follow-Up Time
              </label>
              <input
                type="time"
                value={nextFollowupTime}
                onChange={(e) => setNextFollowupTime(e.target.value)}
                className="w-full bg-[#0d0b21] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Quick Presets
              </label>
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => handleSetPresetFollowup(24)}
                  className="flex-1 py-2 px-2.5 text-xs font-semibold rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition min-h-[44px]"
                >
                  +24h
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPresetFollowup(48)}
                  className="flex-1 py-2 px-2.5 text-xs font-semibold rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition min-h-[44px]"
                >
                  +48h
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPresetFollowup(168)}
                  className="flex-1 py-2 px-2.5 text-xs font-semibold rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition min-h-[44px]"
                >
                  +1 Wk
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Client Requirement Message / Scope of Work
              </label>
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Client requested formal quotation for executive washrooms with teak compact board..."
                className="w-full bg-[#0d0b21] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Internal Sales Notes & Tags
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Architect finalized SS 304 hardware. Very interested in Pacific cubicles; awaiting commercial proposal."
                className="w-full bg-[#0d0b21] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
              />
            </div>
          </div>
        </div>

        {/* Sticky Mobile-Friendly Action Bar */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#121029]/95 backdrop-blur-md border border-[#7FB706]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xl sticky bottom-4 z-20">
          <button
            type="button"
            onClick={() => navigate('/admin/dashboard/crm-leads')}
            className="w-full sm:w-auto px-5 py-3 rounded-xl text-xs sm:text-sm font-semibold text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10 transition min-h-[44px]"
          >
            Cancel & Return
          </button>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#7FB706] hover:bg-[#8ecb08] transition shadow-lg shadow-[#7FB706]/20 flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Creating Lead...' : 'Save & Record Lead'}
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={(e) => handleSubmit(e, true)}
              className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs sm:text-sm font-bold text-black bg-gradient-to-r from-[#7FB706] to-[#B5F823] hover:from-[#8ecb08] hover:to-[#c4fa3f] transition shadow-lg shadow-[#7FB706]/30 flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              Save & Generate Quotation
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
