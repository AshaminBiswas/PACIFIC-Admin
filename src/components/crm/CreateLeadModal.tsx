import React, { useState } from 'react';
import {
  X,
  Target,
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  Layers,
  Lock,
  Columns,
  Flame,
  AlertCircle,
  CheckCircle2,
  Plus,
  Tag,
  DollarSign,
  FileText,
  Briefcase,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { leadManagementApi } from '../../api/leadManagementApi';
import type {
  LeadProductCategory,
  LeadPriority,
  LeadSource,
  LeadClientType,
} from '../../types/admin';

interface CreateLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

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
    badge: 'HPL / Boilo',
    desc: 'High pressure laminate & HDHMR modular partition doors with architectural hardware',
  },
  {
    id: 'LOCKER_SYSTEM',
    name: 'Locker Systems',
    icon: Lock,
    badge: '1–4 Tier',
    desc: 'Heavy duty moisture-proof lockers for gyms, corporate offices & industries',
  },
  {
    id: 'URINAL_PARTITION',
    name: 'Urinal Partitions',
    icon: Columns,
    badge: 'Modesty Screen',
    desc: 'Privacy modesty divider panels in 12mm compact laminate with SS brackets',
  },
  {
    id: 'COMBO_WASHROOM',
    name: 'Washroom Combo',
    icon: Sparkles,
    badge: 'Turnkey Solution',
    desc: 'Integrated turnkey package including cubicles, modesty screens & staff lockers',
  },
];

export default function CreateLeadModal({ isOpen, onClose, onSuccess }: CreateLeadModalProps) {
  // Category Selection
  const [productCategory, setProductCategory] = useState<LeadProductCategory>('RESTROOM_CUBICLE');

  // Contact & Company Details
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [clientType, setClientType] = useState<LeadClientType>('CONTRACTOR');

  // Cubicle Specifications
  const [cubicleDoors, setCubicleDoors] = useState<string | number>(10);
  const [cubicleModel, setCubicleModel] = useState('Pacific Classic Floor-Mounted');
  const [cubicleThickness, setCubicleThickness] = useState('12mm');
  const [cubicleBoardType, setCubicleBoardType] = useState('Compact HPL (Phenolic)');
  const [cubicleHardware, setCubicleHardware] = useState('SS 304 Premium Brush Finish');
  const [cubicleColor, setCubicleColor] = useState('Natural Teak Woodgrain');

  // Locker Specifications
  const [lockerTiers, setLockerTiers] = useState('2-Tier Heavy Duty');
  const [lockerCompartments, setLockerCompartments] = useState<string | number>(24);
  const [lockerLockType, setLockerLockType] = useState('Digital Number Code Lock');
  const [lockerMaterial, setLockerMaterial] = useState('12mm Compact HPL Moisture Proof');

  // Urinal Specifications
  const [urinalScreens, setUrinalScreens] = useState<string | number>(6);
  const [urinalDimensions, setUrinalDimensions] = useState('450 x 900 mm');
  const [urinalMounting, setUrinalMounting] = useState('Wall-hung with SS Brackets & Support Leg');
  const [urinalBoardType, setUrinalBoardType] = useState('12mm Compact Laminate');

  // Commercial & Pipeline Details
  const [estimatedValue, setEstimatedValue] = useState<string | number>('');
  const [priority, setPriority] = useState<LeadPriority>('HOT');
  const [source, setSource] = useState<LeadSource>('DIRECT_CALL');
  const [assignedTo, setAssignedTo] = useState('Vikram Singh (North Sales)');
  const [message, setMessage] = useState('');
  const [notes, setNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Auto-calculate suggested budget when changing product specs
  const handleAutoSuggestBudget = () => {
    let est = 0;
    if (productCategory === 'RESTROOM_CUBICLE') {
      est = Number(cubicleDoors || 0) * 9500;
    } else if (productCategory === 'LOCKER_SYSTEM') {
      est = Number(lockerCompartments || 0) * 6500;
    } else if (productCategory === 'URINAL_PARTITION') {
      est = Number(urinalScreens || 0) * 3500;
    } else {
      est = Number(cubicleDoors || 10) * 9500 + Number(lockerCompartments || 12) * 6500 + Number(urinalScreens || 6) * 3500;
    }
    setEstimatedValue(est);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim()) {
      setError('Contact person name is required.');
      return;
    }
    if (!phone.trim() && !email.trim()) {
      setError('Either phone number or email address is required.');
      return;
    }

    try {
      setIsSubmitting(true);

      const tags = tagsInput
        ? tagsInput
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

      // Auto-add category & city tags
      if (city) tags.push(city);
      if (productCategory === 'RESTROOM_CUBICLE') tags.push('Toilet Cubicles');
      if (productCategory === 'LOCKER_SYSTEM') tags.push('Locker Systems');
      if (productCategory === 'URINAL_PARTITION') tags.push('Urinal Partitions');
      if (productCategory === 'COMBO_WASHROOM') tags.push('Turnkey Combo');

      let estimatedQuantity = 1;
      if (productCategory === 'RESTROOM_CUBICLE') estimatedQuantity = Number(cubicleDoors) || 1;
      else if (productCategory === 'LOCKER_SYSTEM') estimatedQuantity = Number(lockerCompartments) || 1;
      else if (productCategory === 'URINAL_PARTITION') estimatedQuantity = Number(urinalScreens) || 1;
      else estimatedQuantity = (Number(cubicleDoors) || 0) + (Number(lockerCompartments) || 0) + (Number(urinalScreens) || 0);

      await leadManagementApi.create({
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        company: company.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        city: city.trim() || undefined,
        address: address.trim() || undefined,
        clientType,
        productCategory,
        cubicleSpecs:
          productCategory === 'RESTROOM_CUBICLE' || productCategory === 'COMBO_WASHROOM'
            ? {
                doorsCount: Number(cubicleDoors) || undefined,
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
                compartmentsCount: Number(lockerCompartments) || undefined,
                lockType: lockerLockType,
                material: lockerMaterial,
              }
            : undefined,
        urinalSpecs:
          productCategory === 'URINAL_PARTITION' || productCategory === 'COMBO_WASHROOM'
            ? {
                screensCount: Number(urinalScreens) || undefined,
                screenDimensions: urinalDimensions,
                mountingType: urinalMounting,
                boardType: urinalBoardType,
              }
            : undefined,
        estimatedQuantity,
        estimatedValue: estimatedValue ? Number(estimatedValue) : undefined,
        source,
        priority,
        status: 'NEW',
        assignedTo,
        message: message.trim() || undefined,
        notes: notes.trim() || undefined,
        tags: Array.from(new Set(tags)),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create lead record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#09071a] border border-white/10 rounded-2xl shadow-2xl p-4 sm:p-6 overflow-hidden my-4 sm:my-8 max-h-[92vh] flex flex-col">
        {/* Glow Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-500" />

        {/* Title Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">New Commercial Lead Record</h2>
              <p className="text-xs text-gray-400">
                Log prospect inquiry for Restroom Cubicles, Lockers, or Urinal Dividers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2.5 text-xs text-red-400 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-5 overflow-y-auto pr-1 flex-1">
          {/* Step 1: Select Product System */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              1. Product System Required *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {PRODUCT_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = productCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setProductCategory(cat.id)}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500/50 shadow-lg shadow-emerald-950/40 text-white'
                        : 'bg-white/5 border-white/5 hover:border-white/15 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className={`p-2 rounded-lg ${
                          isSelected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-gray-400'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
                        {cat.badge}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{cat.name}</h4>
                      <p className="text-[11px] text-gray-400 leading-snug mt-1 line-clamp-2">{cat.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Dynamic Technical Specifications */}
          <div className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                2. Technical Specifications ({productCategory.replace('_', ' ')})
              </span>
              <button
                type="button"
                onClick={handleAutoSuggestBudget}
                className="text-[11px] font-medium text-emerald-400 hover:text-emerald-300 underline"
              >
                Auto-calculate suggested budget
              </button>
            </div>

            {/* Restroom Cubicle Specs */}
            {(productCategory === 'RESTROOM_CUBICLE' || productCategory === 'COMBO_WASHROOM') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1 border-t border-white/5">
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Number of Cubicle Doors / Bays</label>
                  <input
                    type="number"
                    min="1"
                    value={cubicleDoors}
                    onChange={(e) => setCubicleDoors(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. 12"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Board Thickness</label>
                  <select
                    value={cubicleThickness}
                    onChange={(e) => setCubicleThickness(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0d0b21] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="12mm">12mm (Standard Compact HPL)</option>
                    <option value="18mm">18mm (HDHMR / Boilo Premium)</option>
                    <option value="13mm">13mm (Heavy Traffic)</option>
                    <option value="25mm">25mm (Luxury Solid)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Board Core Material</label>
                  <select
                    value={cubicleBoardType}
                    onChange={(e) => setCubicleBoardType(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0d0b21] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Compact HPL (Phenolic)">Compact HPL (Solid Phenolic)</option>
                    <option value="Boilo / HDHMR High Moisture Resistant">Boilo / HDHMR (Action Tesa)</option>
                    <option value="Compact Merino Phenolic">Compact Merino Phenolic</option>
                    <option value="Antimicrobial Compact Grade">Antimicrobial Hospital Grade</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Hardware Package</label>
                  <select
                    value={cubicleHardware}
                    onChange={(e) => setCubicleHardware(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0d0b21] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="SS 304 Premium Brush Finish">SS 304 Premium (Brush Matte)</option>
                    <option value="Nylon Black Matt Antibacterial">Nylon Black Matt (Heavy Grade)</option>
                    <option value="Shoe Box Aluminium Anodized">Shoe-Box Profile Aluminium</option>
                    <option value="SS 316 Marine Grade">SS 316 Marine Grade</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Cubicle Model / Elevation</label>
                  <select
                    value={cubicleModel}
                    onChange={(e) => setCubicleModel(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0d0b21] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Pacific Classic Floor-Mounted">Pacific Classic (Floor Supported)</option>
                    <option value="Pacific Designer Ceiling-Hung">Pacific Ceiling-Suspended</option>
                    <option value="Pacific Floor Anchored">Pacific Floor-Anchored with Headrail</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Color / Finish Preference</label>
                  <input
                    type="text"
                    value={cubicleColor}
                    onChange={(e) => setCubicleColor(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. Natural Teak, Frost Grey, Charcoal"
                  />
                </div>
              </div>
            )}

            {/* Locker System Specs */}
            {(productCategory === 'LOCKER_SYSTEM' || productCategory === 'COMBO_WASHROOM') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t border-white/5">
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Locker Tier Configuration</label>
                  <select
                    value={lockerTiers}
                    onChange={(e) => setLockerTiers(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0d0b21] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="1-Tier Full Height">1-Tier (Full Height 1800mm)</option>
                    <option value="2-Tier Heavy Duty">2-Tier (Two Compartments per Bay)</option>
                    <option value="3-Tier Standard">3-Tier (Three Compartments per Bay)</option>
                    <option value="4-Tier Compact">4-Tier (Four Compartments per Bay)</option>
                    <option value="Z-Locker Dual Space">Z-Locker (Garment & Bag Dual)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Total Locker Compartments</label>
                  <input
                    type="number"
                    min="1"
                    value={lockerCompartments}
                    onChange={(e) => setLockerCompartments(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. 24"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Locking Mechanism</label>
                  <select
                    value={lockerLockType}
                    onChange={(e) => setLockerLockType(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0d0b21] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Digital Number Code Lock">Digital Keypad / Code Lock</option>
                    <option value="Key Cam Lock (Master Keyed)">Key Cam Lock (Master Keyed)</option>
                    <option value="RFID Smart Card Contactless">RFID Smart Card / Mifare</option>
                    <option value="Padlock Hasp Swivel">Padlock Hasp (User Provided)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Urinal Partition Specs */}
            {(productCategory === 'URINAL_PARTITION' || productCategory === 'COMBO_WASHROOM') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t border-white/5">
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Urinal Modesty Screens Count</label>
                  <input
                    type="number"
                    min="1"
                    value={urinalScreens}
                    onChange={(e) => setUrinalScreens(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. 6"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Screen Dimensions</label>
                  <select
                    value={urinalDimensions}
                    onChange={(e) => setUrinalDimensions(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0d0b21] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="450 x 900 mm">450 x 900 mm (Standard Commercial)</option>
                    <option value="400 x 900 mm">400 x 900 mm (Compact)</option>
                    <option value="500 x 1200 mm">500 x 1200 mm (Extended Full Privacy)</option>
                    <option value="Custom Size">Custom Size per Drawing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Mounting System</label>
                  <select
                    value={urinalMounting}
                    onChange={(e) => setUrinalMounting(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0d0b21] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Wall-hung with SS Brackets & Support Leg">Wall-hung with SS Brackets & Support Leg</option>
                    <option value="Wall-hung Only (Heavy Duty Clamps)">Wall-hung Only (Heavy Duty Clamps)</option>
                    <option value="Floor Mounted with SS Legs">Floor Mounted with SS Legs</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Step 3: Prospect Contact Details */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              3. Prospect & Company Details
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. Rohit"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. Sharma"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Company / Organization</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. DLF CyberCity Ltd"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Phone / WhatsApp *</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. +91 98112 34567"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. rohit.sharma@dlf.in"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Client Category</label>
                <select
                  value={clientType}
                  onChange={(e) => setClientType(e.target.value as LeadClientType)}
                  className="w-full px-3 py-2 bg-[#0d0b21] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="CONTRACTOR">General Contractor / MEP</option>
                  <option value="ARCHITECT">Architect & Interior Designer</option>
                  <option value="CORPORATE_CLIENT">Corporate Client / Facility</option>
                  <option value="BUILDER">Real Estate Developer / Builder</option>
                  <option value="GOVERNMENT">Government / PSU / Rail</option>
                  <option value="DEALER">Authorized Dealer / Reseller</option>
                  <option value="INDIVIDUAL">Direct Individual Buyer</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Project Site City / State</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. Gurgaon, Haryana"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] text-gray-400 mb-1">Site Delivery Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. Tower B, DLF Cyber Park, Sector 20"
                />
              </div>
            </div>
          </div>

          {/* Step 4: Commercial & Pipeline Settings */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              4. Commercial & Opportunity Pipeline
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Estimated Budget / Value (₹)</label>
                <input
                  type="number"
                  value={estimatedValue}
                  onChange={(e) => setEstimatedValue(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  placeholder="e.g. 150000"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Priority / Urgency</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as LeadPriority)}
                  className="w-full px-3 py-2 bg-[#0d0b21] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="HOT">🔥 HOT (Immediate Closure)</option>
                  <option value="WARM">⚡ WARM (Evaluating)</option>
                  <option value="COLD">❄️ COLD (Information Only)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Enquiry Source</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value as LeadSource)}
                  className="w-full px-3 py-2 bg-[#0d0b21] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="DIRECT_CALL">Direct Phone Call</option>
                  <option value="WHATSAPP">WhatsApp Enquiry</option>
                  <option value="WEBSITE">Website Contact Form</option>
                  <option value="ARCHITECT_SPEC">Architect Specification</option>
                  <option value="CONFIGURATOR">3D Configurator</option>
                  <option value="EXHIBITION">Trade Fair / Exhibition</option>
                  <option value="REFERRAL">Client Referral</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Assigned Sales Executive</label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0d0b21] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Vikram Singh (North Sales)">Vikram Singh (North)</option>
                  <option value="Neha Gupta (Key Accounts)">Neha Gupta (Key Accounts)</option>
                  <option value="Siddharth M (West Region)">Siddharth M (West)</option>
                  <option value="Karthik R (South Region)">Karthik R (South)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Initial Discussion Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                  placeholder="e.g. Met on site, client needs 12mm Teak finish compact board sample"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. DLF, Teak, Urgent, Turnkey"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-black bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 transition shadow-lg shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {isSubmitting ? 'Creating Lead...' : 'Create Commercial Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
