import React, { useState } from 'react';
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
} from 'lucide-react';
import { leadManagementApi } from '../../api/leadManagementApi';
import type {
  LeadProductCategory,
  LeadClientType,
  LeadPriority,
  LeadSource,
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

export default function CreateLeadPage() {
  const navigate = useNavigate();

  // Category Selection
  const [productCategory, setProductCategory] = useState<LeadProductCategory>('RESTROOM_CUBICLE');

  // Prospect & Company Info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [clientType, setClientType] = useState<LeadClientType>('CONTRACTOR');

  // Cubicle Specs
  const [cubicleDoors, setCubicleDoors] = useState<number>(10);
  const [cubicleModel, setCubicleModel] = useState('Pacific Classic Floor-Mounted');
  const [cubicleThickness, setCubicleThickness] = useState('12mm');
  const [cubicleBoardType, setCubicleBoardType] = useState('Compact HPL (Phenolic)');
  const [cubicleHardware, setCubicleHardware] = useState('SS 304 Premium Brush Finish');
  const [cubicleColor, setCubicleColor] = useState('Natural Teak Woodgrain');

  // Locker Specs
  const [lockerTiers, setLockerTiers] = useState('2-Tier Heavy Duty');
  const [lockerCompartments, setLockerCompartments] = useState<number>(24);
  const [lockerLockType, setLockerLockType] = useState('Digital Number Code Lock');
  const [lockerMaterial, setLockerMaterial] = useState('12mm Compact HPL Moisture Proof');

  // Urinal Specs
  const [urinalScreens, setUrinalScreens] = useState<number>(6);
  const [urinalDimensions, setUrinalDimensions] = useState('450 x 900 mm');
  const [urinalMounting, setUrinalMounting] = useState('Wall-hung with SS Brackets & Support Leg');
  const [urinalBoardType, setUrinalBoardType] = useState('12mm Compact Laminate');

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

    try {
      setIsSubmitting(true);
      setError(null);

      // Calculate quantity
      let estimatedQuantity = 1;
      if (productCategory === 'RESTROOM_CUBICLE') estimatedQuantity = Number(cubicleDoors) || 1;
      else if (productCategory === 'LOCKER_SYSTEM') estimatedQuantity = Number(lockerCompartments) || 1;
      else if (productCategory === 'URINAL_PARTITION') estimatedQuantity = Number(urinalScreens) || 1;
      else if (productCategory === 'COMBO_WASHROOM') estimatedQuantity = Number(cubicleDoors) + Number(urinalScreens);

      // Auto-calculate estimate if empty
      let finalEstValue = Number(estimatedValue);
      if (!finalEstValue || isNaN(finalEstValue)) {
        if (productCategory === 'RESTROOM_CUBICLE') finalEstValue = estimatedQuantity * 9500;
        else if (productCategory === 'LOCKER_SYSTEM') finalEstValue = estimatedQuantity * 6500;
        else if (productCategory === 'URINAL_PARTITION') finalEstValue = estimatedQuantity * 3500;
        else finalEstValue = estimatedQuantity * 8500;
      }

      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const followupDateTime = nextFollowupDate
        ? new Date(`${nextFollowupDate}T${nextFollowupTime || '11:00'}:00`).toISOString()
        : new Date(Date.now() + 24 * 3600 * 1000).toISOString();

      const newLeadData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        company: company.trim(),
        city: city.trim(),
        address: address.trim(),
        clientType,
        productCategory,
        cubicleSpecs:
          productCategory === 'RESTROOM_CUBICLE' || productCategory === 'COMBO_WASHROOM'
            ? {
                doorsCount: Number(cubicleDoors) || 1,
                cubicleModel,
                boardThickness: cubicleThickness,
                boardType: cubicleBoardType,
                hardwarePackage: cubicleHardware,
                colorPreference: cubicleColor,
              }
            : undefined,
        lockerSpecs:
          productCategory === 'LOCKER_SYSTEM' || productCategory === 'COMBO_WASHROOM'
            ? {
                lockerTiers,
                compartmentsCount: Number(lockerCompartments) || 1,
                lockType: lockerLockType,
                material: lockerMaterial,
              }
            : undefined,
        urinalSpecs:
          productCategory === 'URINAL_PARTITION' || productCategory === 'COMBO_WASHROOM'
            ? {
                screensCount: Number(urinalScreens) || 1,
                screenDimensions: urinalDimensions,
                mountingType: urinalMounting,
                boardType: urinalBoardType,
              }
            : undefined,
        estimatedQuantity,
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
        {/* Step 1: Select Product Category */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#121029] border border-[#7FB706]/30 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#7FB706] flex items-center gap-1.5">
              <Layers className="w-4 h-4" /> 1. Select Product System
            </span>
            <span className="text-[11px] text-gray-400 hidden sm:inline">
              Choose the primary commercial washroom component
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {PRODUCT_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = productCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setProductCategory(cat.id)}
                  className={`p-4 rounded-xl border text-left transition relative flex flex-col justify-between min-h-[96px] ${
                    isSelected
                      ? 'bg-[#7FB706]/15 border-[#7FB706] shadow-lg shadow-[#7FB706]/10'
                      : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className={`p-2 rounded-lg ${
                          isSelected
                            ? 'bg-[#7FB706] text-black font-bold'
                            : 'bg-white/5 text-gray-400'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isSelected
                            ? 'bg-[#7FB706]/20 text-[#7FB706] border-[#7FB706]/40'
                            : 'bg-white/5 text-gray-400 border-white/10'
                        }`}
                      >
                        {cat.badge}
                      </span>
                    </div>
                    <div className="font-bold text-white text-sm">{cat.name}</div>
                    <p className="text-[11px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                      {cat.desc}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#7FB706] shadow-sm shadow-[#7FB706]" />
                  )}
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

        {/* Step 3: Technical Product Specifications (Dynamic) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#121029] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#7FB706] flex items-center gap-1.5">
              <Briefcase className="w-4 h-4" /> 3. Technical Requirements ({productCategory.replace('_', ' ')})
            </span>
            <span className="text-[11px] text-gray-400 hidden sm:inline">
              Configure models, boards, hardware and units
            </span>
          </div>

          {/* Cubicle Specific Fields */}
          {(productCategory === 'RESTROOM_CUBICLE' || productCategory === 'COMBO_WASHROOM') && (
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#7FB706]" /> Restroom Cubicle Details
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                    Number of Doors / Cubicle Units
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={cubicleDoors}
                    onChange={(e) => setCubicleDoors(Number(e.target.value) || 1)}
                    className="w-full bg-[#0d0b21] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[40px]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                    Cubicle Mounting Model
                  </label>
                  <select
                    value={cubicleModel}
                    onChange={(e) => setCubicleModel(e.target.value)}
                    className="w-full bg-[#0d0b21] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[40px]"
                  >
                    <option value="Pacific Classic Floor-Mounted">Pacific Classic Floor-Mounted</option>
                    <option value="Pacific Ceiling-Hung Floating">Pacific Ceiling-Hung Floating</option>
                    <option value="Pacific Shoe-Box Aluminium Anchored">Pacific Shoe-Box Aluminium Anchored</option>
                    <option value="Pacific Designer Stainless Deluxe">Pacific Designer Stainless Deluxe</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                    Board Thickness
                  </label>
                  <select
                    value={cubicleThickness}
                    onChange={(e) => setCubicleThickness(e.target.value)}
                    className="w-full bg-[#0d0b21] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[40px]"
                  >
                    <option value="12mm">12mm (Standard Heavy Duty)</option>
                    <option value="18mm">18mm (Premium Solid Grade)</option>
                    <option value="13mm">13mm (Imported Specification)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                    Board Core / Material
                  </label>
                  <select
                    value={cubicleBoardType}
                    onChange={(e) => setCubicleBoardType(e.target.value)}
                    className="w-full bg-[#0d0b21] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[40px]"
                  >
                    <option value="Compact HPL (Phenolic)">Compact HPL (Phenolic Solid Core)</option>
                    <option value="Boilo / HDHMR High Moisture Resistant">Boilo / HDHMR High Moisture Resistant</option>
                    <option value="Merino Compact Phenolic">Merino Compact Phenolic</option>
                    <option value="Action TESA HDHMR Moisture Proof">Action TESA HDHMR Moisture Proof</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                    Hardware Fitting Package
                  </label>
                  <select
                    value={cubicleHardware}
                    onChange={(e) => setCubicleHardware(e.target.value)}
                    className="w-full bg-[#0d0b21] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[40px]"
                  >
                    <option value="SS 304 Premium Brush Finish">SS 304 Premium Brush Finish</option>
                    <option value="SS 316 Coastal Grade Heavy Duty">SS 316 Coastal Grade Heavy Duty</option>
                    <option value="Nylon Black Matt Antibacterial">Nylon Black Matt Antibacterial</option>
                    <option value="Shoe Box Aluminium Anodized">Shoe Box Aluminium Anodized</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                    Color / Finish Preference
                  </label>
                  <input
                    type="text"
                    value={cubicleColor}
                    onChange={(e) => setCubicleColor(e.target.value)}
                    placeholder="e.g. Natural Teak, Slate Grey, Walnut"
                    className="w-full bg-[#0d0b21] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[40px]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Locker Specific Fields */}
          {(productCategory === 'LOCKER_SYSTEM' || productCategory === 'COMBO_WASHROOM') && (
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#7FB706]" /> Locker System Details
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                    Locker Tier Structure
                  </label>
                  <select
                    value={lockerTiers}
                    onChange={(e) => setLockerTiers(e.target.value)}
                    className="w-full bg-[#0d0b21] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[40px]"
                  >
                    <option value="1-Tier Single Door Full Height">1-Tier Single Door Full Height</option>
                    <option value="2-Tier Heavy Duty">2-Tier Heavy Duty</option>
                    <option value="3-Tier Multi-User">3-Tier Multi-User</option>
                    <option value="4-Tier Compact">4-Tier Compact</option>
                    <option value="Z-Type Executive Locker">Z-Type Executive Locker</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                    Total Compartments / Lockers
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={lockerCompartments}
                    onChange={(e) => setLockerCompartments(Number(e.target.value) || 1)}
                    className="w-full bg-[#0d0b21] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[40px]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                    Locking Mechanism
                  </label>
                  <select
                    value={lockerLockType}
                    onChange={(e) => setLockerLockType(e.target.value)}
                    className="w-full bg-[#0d0b21] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[40px]"
                  >
                    <option value="Digital Number Code Lock">Digital Combination Code Lock</option>
                    <option value="Cam Lock with Master Key">Cam Lock with Master Key System</option>
                    <option value="Padlock Hasp Lock">Padlock Hasp Lock</option>
                    <option value="RFID Electronic Smart Card">RFID Electronic Smart Card</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Urinal Specific Fields */}
          {(productCategory === 'URINAL_PARTITION' || productCategory === 'COMBO_WASHROOM') && (
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Columns className="w-3.5 h-3.5 text-[#7FB706]" /> Urinal Partition Details
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                    Number of Modesty Screens
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={urinalScreens}
                    onChange={(e) => setUrinalScreens(Number(e.target.value) || 1)}
                    className="w-full bg-[#0d0b21] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[40px]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                    Screen Dimensions
                  </label>
                  <select
                    value={urinalDimensions}
                    onChange={(e) => setUrinalDimensions(e.target.value)}
                    className="w-full bg-[#0d0b21] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[40px]"
                  >
                    <option value="450 x 900 mm">450 x 900 mm (Standard Commercial)</option>
                    <option value="450 x 1000 mm">450 x 1000 mm (Extended Privacy)</option>
                    <option value="600 x 1200 mm">600 x 1200 mm (Executive Full Height)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                    Mounting Hardware
                  </label>
                  <select
                    value={urinalMounting}
                    onChange={(e) => setUrinalMounting(e.target.value)}
                    className="w-full bg-[#0d0b21] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[40px]"
                  >
                    <option value="Wall-hung with SS Brackets & Support Leg">Wall-hung with SS Brackets & Support Leg</option>
                    <option value="Wall-hung with Heavy Duty SS Brackets Only">Wall-hung with Heavy Duty SS Brackets Only</option>
                    <option value="Full Floor Anchored SS Box Frame">Full Floor Anchored SS Box Frame</option>
                  </select>
                </div>
              </div>
            </div>
          )}
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
