import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  RotateCcw,
  CheckCircle2,
  Upload,
  X,
  Package,
  Layers,
  Shield,
  Palette,
  Check,
  Sparkles,
  Info,
} from 'lucide-react';
import { uploadImage } from '@/lib/supabase';
import { productCatalogApi } from '@/api/productCatalogApi';
import { DEFAULT_CUBICLE_DESCRIPTION } from '@/data/productCatalogData';
import type {
  ProductCategoryType,
  ModelHardwareItem,
  ModelHardwareOption,
  SSHardwareColor,
  ProductCatalogModel,
} from '@/types/admin';

const LOCAL_STORAGE_DRAFT_KEY = 'pacific_create_product_model_draft_v3';
const SS_COLORS: SSHardwareColor[] = ['golden', 'Black', 'stainless steel'];

function toSlug(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function CreateAdminProductPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get('category') as ProductCategoryType | null;

  const [lastSavedTime, setLastSavedTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Form State ──
  const [category, setCategory] = useState<ProductCategoryType>(
    categoryParam && ['Cubicle', 'Lockers', 'Urinal Partitions'].includes(categoryParam)
      ? categoryParam
      : 'Cubicle'
  );
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState(DEFAULT_CUBICLE_DESCRIPTION);
  const [imageUrl, setImageUrl] = useState(
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80'
  );
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState('');

  // ── Cubicle Specifications State ──
  const [stdHeight, setStdHeight] = useState('1980 mm / 2000 mm (including 150mm floor gap)');
  const [stdDepth, setStdDepth] = useState('1500 mm – 1800 mm');
  const [doorWidth, setDoorWidth] = useState('600 mm (Standard) / 900 mm (Accessible/ADA)');
  const [boardThickness, setBoardThickness] = useState('12mm / 18mm Solid Compact Phenolic Laminate');
  const [fireRating, setFireRating] = useState('Class 1 / BS 476 Part 7');
  const [waterResistance, setWaterResistance] = useState('100% Moisture, Water & Humidity Proof');

  // Hardware options
  const [ssEnabled, setSsEnabled] = useState(true);
  const [ssColors, setSsColors] = useState<SSHardwareColor[]>(['golden', 'Black', 'stainless steel']);
  const [nylonEnabled, setNylonEnabled] = useState(true);
  const [tierCount, setTierCount] = useState<string | number>(1);
  const [hasExtraLeg, setHasExtraLeg] = useState(false);

  // Hardware list (NO quantity/unit)
  const [hardwareList, setHardwareList] = useState<ModelHardwareItem[]>([
    { id: '1', name: 'Gravity Hinges (Self-Closing Pair)', material: 'Both' },
    { id: '2', name: 'Occupancy Indicator Lock with Emergency Release', material: 'Both' },
    { id: '3', name: 'Ergonomic Door Pull Handle / Knob', material: 'Both' },
    { id: '4', name: 'Coat Hook with Integrated Rubber Buffer Stop', material: 'Both' },
    { id: '5', name: 'Adjustable Supporting Legs (100–150mm)', material: 'Both' },
  ]);

  const [newHwName, setNewHwName] = useState('');

  // Load draft
  useEffect(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_DRAFT_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.category) setCategory(parsed.category);
        if (parsed.title) setTitle(parsed.title);
        if (parsed.subtitle) setSubtitle(parsed.subtitle);
        if (parsed.description) setDescription(parsed.description);
        if (parsed.imageUrl) setImageUrl(parsed.imageUrl);
        if (parsed.hardwareList) setHardwareList(parsed.hardwareList);
        if (parsed.ssEnabled !== undefined) setSsEnabled(parsed.ssEnabled);
        if (parsed.ssColors) setSsColors(parsed.ssColors);
        if (parsed.nylonEnabled !== undefined) setNylonEnabled(parsed.nylonEnabled);
        if (parsed.tierCount) setTierCount(parsed.tierCount);
        if (parsed.hasExtraLeg !== undefined) setHasExtraLeg(parsed.hasExtraLeg);
        if (parsed.stdHeight) setStdHeight(parsed.stdHeight);
        if (parsed.stdDepth) setStdDepth(parsed.stdDepth);
        if (parsed.doorWidth) setDoorWidth(parsed.doorWidth);
        if (parsed.boardThickness) setBoardThickness(parsed.boardThickness);
        if (parsed.fireRating) setFireRating(parsed.fireRating);
        if (parsed.waterResistance) setWaterResistance(parsed.waterResistance);
      }
    } catch {}
  }, []);

  // Auto-save draft
  useEffect(() => {
    try {
      const draft = {
        category,
        title,
        subtitle,
        description,
        imageUrl,
        hardwareList,
        ssEnabled,
        ssColors,
        nylonEnabled,
        tierCount,
        hasExtraLeg,
        stdHeight,
        stdDepth,
        doorWidth,
        boardThickness,
        fireRating,
        waterResistance,
      };
      localStorage.setItem(LOCAL_STORAGE_DRAFT_KEY, JSON.stringify(draft));
      setLastSavedTime(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    } catch {}
  }, [
    category,
    title,
    subtitle,
    description,
    imageUrl,
    hardwareList,
    ssEnabled,
    ssColors,
    nylonEnabled,
    tierCount,
    hasExtraLeg,
    stdHeight,
    stdDepth,
    doorWidth,
    boardThickness,
    fireRating,
    waterResistance,
  ]);

  const handleResetDraft = () => {
    if (window.confirm('Reset this model draft to standard defaults?')) {
      localStorage.removeItem(LOCAL_STORAGE_DRAFT_KEY);
      setTitle('');
      setSubtitle('');
      setDescription(DEFAULT_CUBICLE_DESCRIPTION);
      setCategory('Cubicle');
      setImageUrl('https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80');
      setStdHeight('1980 mm / 2000 mm (including 150mm floor gap)');
      setStdDepth('1500 mm – 1800 mm');
      setDoorWidth('600 mm (Standard) / 900 mm (Accessible/ADA)');
      setBoardThickness('12mm / 18mm Solid Compact Phenolic Laminate');
      setFireRating('Class 1 / BS 476 Part 7');
      setWaterResistance('100% Moisture, Water & Humidity Proof');
      setHardwareList([
        { id: '1', name: 'Gravity Hinges (Self-Closing Pair)', material: 'Both' },
        { id: '2', name: 'Occupancy Indicator Lock with Emergency Release', material: 'Both' },
        { id: '3', name: 'Ergonomic Door Pull Handle / Knob', material: 'Both' },
        { id: '4', name: 'Coat Hook with Integrated Rubber Buffer Stop', material: 'Both' },
        { id: '5', name: 'Adjustable Supporting Legs (100–150mm)', material: 'Both' },
      ]);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setImageError('');
    try {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);

      const url = await uploadImage(file, 'products');
      if (url) setImageUrl(url);
    } catch (err: any) {
      setImageError(err.message || 'Image preview applied');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddHwItem = () => {
    if (!newHwName.trim()) return;
    setHardwareList((prev) => [
      ...prev,
      {
        id: `hw-${Date.now()}`,
        name: newHwName.trim(),
        material: category === 'Cubicle' ? 'Both' : 'Standard',
      },
    ]);
    setNewHwName('');
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert('Please enter a model name');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalSlug = slug.trim() ? toSlug(slug) : `${toSlug(category)}-${toSlug(title)}`;
      const id = `model-${toSlug(category)}-${toSlug(title)}-${Date.now()}`;

      const hardwareOptions: ModelHardwareOption[] = [];
      if (category === 'Cubicle') {
        if (ssEnabled) {
          hardwareOptions.push({
            material: 'SS Hardware',
            enabled: true,
            colors: ssColors.length > 0 ? ssColors : ['golden', 'Black', 'stainless steel'],
          });
        }
        if (nylonEnabled) {
          hardwareOptions.push({
            material: 'Nylon Hardware',
            enabled: true,
            colors: [],
          });
        }
      } else {
        hardwareOptions.push({
          material: 'Standard',
          enabled: true,
        });
      }

      const specifications =
        category === 'Cubicle'
          ? [
              { label: 'Standard Height', value: stdHeight },
              { label: 'Standard Depth', value: stdDepth },
              { label: 'Door Width', value: doorWidth },
              { label: 'Board Thickness', value: boardThickness },
              { label: 'Fire Rating', value: fireRating },
              { label: 'Water Resistance', value: waterResistance },
            ]
          : [
              { label: 'Category', value: category },
              { label: 'Board Thickness', value: boardThickness || '12mm / 18mm Compact Board' },
            ];

      const newModel: ProductCatalogModel = {
        id,
        slug: finalSlug,
        title: title.trim(),
        category,
        subtitle: subtitle.trim() || `${category} Model`,
        description: description.trim() || (category === 'Cubicle' ? DEFAULT_CUBICLE_DESCRIPTION : `${title} model by Pacific Restroom Cubicles.`),
        imageUrl: imageUrl,
        hardwareOptions,
        hardwareList,
        specifications,
        features: [
          '100% Water & Termite Proof',
          'Heavy Duty Hardware',
          'Pan-India Supply & Installation',
        ],
        hasExtraLeg: category === 'Urinal Partitions' ? hasExtraLeg : false,
        tierCount: category === 'Lockers' ? tierCount : undefined,
        sortOrder: 99,
        published: true,
        isFeatured: false,
      };

      await productCatalogApi.saveModel(newModel);
      localStorage.removeItem(LOCAL_STORAGE_DRAFT_KEY);
      alert(`Model "${title}" created successfully!`);
      navigate('/admin/dashboard/products');
    } catch (err: any) {
      alert(err.message || 'Failed to save model');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#121226] border border-white/5 p-4 sm:p-6 rounded-3xl">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/dashboard/products"
            className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition border border-white/5 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <span className="text-xs font-semibold text-[#7FB706] tracking-wider uppercase flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" />
              Dedicated Model Creator
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-white mt-0.5">
              Add New Product Model
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lastSavedTime && (
            <span className="text-[11px] text-gray-500 font-mono hidden sm:inline">
              Draft saved at {lastSavedTime}
            </span>
          )}
          <button
            type="button"
            onClick={handleResetDraft}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs font-semibold border border-white/5 flex items-center gap-1.5 transition min-h-[40px]"
            title="Reset Draft"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-black font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-[#7FB706]/20 transition min-h-[40px] disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? 'Saving...' : 'Save Model'}</span>
          </button>
        </div>
      </div>

      {/* Main Form Fields */}
      <div className="space-y-6">
        {/* 1. Category Selection */}
        <div className="p-5 sm:p-6 bg-[#121226] border border-white/5 rounded-3xl space-y-4">
          <label className="block text-xs font-bold text-gray-200 uppercase tracking-wider">
            1. Select Product Line <span className="text-rose-400">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(['Cubicle', 'Lockers', 'Urinal Partitions'] as ProductCategoryType[]).map((cat) => {
              const isSelected = category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setCategory(cat);
                    if (cat === 'Cubicle') {
                      setDescription(DEFAULT_CUBICLE_DESCRIPTION);
                      setStdHeight('1980 mm / 2000 mm (including 150mm floor gap)');
                      setStdDepth('1500 mm – 1800 mm');
                      setDoorWidth('600 mm (Standard) / 900 mm (Accessible/ADA)');
                      setBoardThickness('12mm / 18mm Solid Compact Phenolic Laminate');
                      setFireRating('Class 1 / BS 476 Part 7');
                      setWaterResistance('100% Moisture, Water & Humidity Proof');
                    }
                  }}
                  className={`p-4 rounded-2xl border text-left transition flex items-center justify-between min-h-[58px] ${
                    isSelected
                      ? 'border-[#7FB706] bg-[#7FB706]/10 text-white font-bold ring-1 ring-[#7FB706]'
                      : 'border-white/5 bg-[#0a0a1a] text-gray-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  <div>
                    <div className="text-sm font-semibold">{cat}</div>
                    <div className="text-[11px] opacity-75 font-normal">
                      {cat === 'Cubicle'
                        ? '13 Models • SS / Nylon'
                        : cat === 'Lockers'
                        ? '7 Models • Uniform H/W'
                        : '4 Models • Extra Leg'}
                    </div>
                  </div>
                  {isSelected && <CheckCircle2 className="w-5 h-5 text-[#7FB706]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Basic Model Info */}
        <div className="p-5 sm:p-6 bg-[#121226] border border-white/5 rounded-3xl space-y-4">
          <label className="block text-xs font-bold text-gray-200 uppercase tracking-wider">
            2. Model Identification
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Model Name / Title <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Delight, Platina Wave, Tier 1 locker"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!slug || slug === toSlug(title)) {
                    setSlug(toSlug(e.target.value));
                  }
                }}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Subtitle / Tagline
              </label>
              <input
                type="text"
                placeholder="e.g. Heavy Duty Commercial Cubicle"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
              />
            </div>
          </div>
        </div>

        {/* 3. Description & Specifications */}
        <div className="p-5 sm:p-6 bg-[#121226] border border-white/5 rounded-3xl space-y-5">
          <div className="border-b border-white/10 pb-3">
            <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider">
              3. Description & Specifications
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Standard commercial restroom cubicle system engineering specifications
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Model Narrative Description
            </label>
            <textarea
              rows={3}
              placeholder="Engineered solid phenolic compact laminate solution..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-3 text-xs sm:text-sm text-white focus:outline-none focus:border-[#7FB706] leading-relaxed"
            />
          </div>

          {category === 'Cubicle' && (
            <div className="pt-3 border-t border-white/5 space-y-3">
              <div className="text-xs font-bold text-[#7FB706] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Standard Cubicle Specifications (Applied across all cubicle models)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                    Standard Height
                  </label>
                  <input
                    type="text"
                    value={stdHeight}
                    onChange={(e) => setStdHeight(e.target.value)}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                    Standard Depth
                  </label>
                  <input
                    type="text"
                    value={stdDepth}
                    onChange={(e) => setStdDepth(e.target.value)}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                    Door Width
                  </label>
                  <input
                    type="text"
                    value={doorWidth}
                    onChange={(e) => setDoorWidth(e.target.value)}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                    Board Thickness
                  </label>
                  <input
                    type="text"
                    value={boardThickness}
                    onChange={(e) => setBoardThickness(e.target.value)}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                    Fire Rating
                  </label>
                  <input
                    type="text"
                    value={fireRating}
                    onChange={(e) => setFireRating(e.target.value)}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                    Water Resistance
                  </label>
                  <input
                    type="text"
                    value={waterResistance}
                    onChange={(e) => setWaterResistance(e.target.value)}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. Image Upload */}
        <div className="p-5 sm:p-6 bg-[#121226] border border-white/5 rounded-3xl space-y-4">
          <label className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
            <Upload className="w-4 h-4 text-[#7FB706]" />
            4. Model Image Upload <span className="text-rose-400">*</span>
          </label>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-28 h-28 rounded-2xl overflow-hidden bg-[#0a0a1a] border border-white/10 shrink-0">
              <img src={imageUrl} alt="Model Preview" className="w-full h-full object-cover" />
            </div>

            <div className="flex-1 w-full space-y-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-semibold border border-white/10 flex items-center gap-2 min-h-[44px] transition disabled:opacity-50"
              >
                <Upload className="w-4 h-4 text-[#7FB706]" />
                <span>{uploadingImage ? 'Uploading...' : 'Choose File to Upload'}</span>
              </button>

              <input
                type="text"
                placeholder="Or paste direct image URL (https://...)"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
              />

              {imageError && <div className="text-[11px] text-amber-400">{imageError}</div>}
            </div>
          </div>
        </div>

        {/* 5. Hardware Configuration Area */}
        <div className="p-5 sm:p-6 bg-[#121226] border border-white/5 rounded-3xl space-y-4">
          <label className="block text-xs font-bold text-gray-200 uppercase tracking-wider">
            5. Hardware Options Configuration
          </label>

          {/* Cubicle rules */}
          {category === 'Cubicle' && (
            <div className="space-y-4">
              {/* SS Hardware Toggle */}
              <div className="p-3.5 bg-black/40 border border-white/5 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white">
                    <input
                      type="checkbox"
                      checked={ssEnabled}
                      onChange={(e) => setSsEnabled(e.target.checked)}
                      className="w-4 h-4 accent-[#7FB706] rounded cursor-pointer"
                    />
                    <span>SS Hardware (Stainless Steel 304/316)</span>
                  </label>
                  <span className="text-[11px] text-gray-400">3 Color Options</span>
                </div>

                {ssEnabled && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                    {SS_COLORS.map((col) => {
                      const isSel = ssColors.includes(col);
                      return (
                        <button
                          key={col}
                          type="button"
                          onClick={() => {
                            if (isSel) {
                              if (ssColors.length > 1) setSsColors(ssColors.filter((c) => c !== col));
                            } else {
                              setSsColors([...ssColors, col]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 min-h-[38px] ${
                            isSel ? 'bg-[#7FB706]/20 border-[#7FB706] text-white' : 'bg-white/5 border-white/10 text-gray-400'
                          }`}
                        >
                          <span className="capitalize">{col}</span>
                          {isSel && <Check className="w-3.5 h-3.5 text-[#7FB706]" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Nylon Hardware Toggle */}
              <div className="p-3.5 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white">
                  <input
                    type="checkbox"
                    checked={nylonEnabled}
                    onChange={(e) => setNylonEnabled(e.target.checked)}
                    className="w-4 h-4 accent-[#7FB706] rounded cursor-pointer"
                  />
                  <span>Nylon Hardware (Polyamide)</span>
                </label>
              </div>
            </div>
          )}

          {/* Locker rules */}
          {category === 'Lockers' && (
            <div className="space-y-3">
              <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-xs text-indigo-300">
                Every locker model uses uniform standard hardware (no color options).
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Tier Count</label>
                <select
                  value={tierCount}
                  onChange={(e) => setTierCount(e.target.value)}
                  className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                >
                  <option value="1">Tier 1</option>
                  <option value="2">Tier 2</option>
                  <option value="3">Tier 3</option>
                  <option value="4">Tier 4</option>
                  <option value="5">Tier 5</option>
                  <option value="6">Tier 6</option>
                  <option value="Z-2">Z-Shape</option>
                </select>
              </div>
            </div>
          )}

          {/* Urinal Partition rules */}
          {category === 'Urinal Partitions' && (
            <div className="space-y-3">
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-300">
                Model A uses an extra hardware which is <strong>Leg</strong>, while the rest use standard wall mount.
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-white">
                <input
                  type="checkbox"
                  checked={hasExtraLeg}
                  onChange={(e) => setHasExtraLeg(e.target.checked)}
                  className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                />
                <span>Include Extra Floor Supporting Leg (Model A Specification)</span>
              </label>
            </div>
          )}
        </div>

        {/* 6. Hardware Bill of Materials (NO Quantity Option) */}
        <div className="p-5 sm:p-6 bg-[#121226] border border-white/5 rounded-3xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <label className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#7FB706]" />
                6. Hardware Bill of Materials ({hardwareList.length} items)
              </label>
              <p className="text-xs text-gray-400 mt-0.5">
                Itemized hardware component list required for assembling this model
              </p>
            </div>
            <span className="text-xs font-mono text-[#7FB706] bg-[#7FB706]/10 px-2.5 py-1 rounded-xl border border-[#7FB706]/20 font-bold">
              {hardwareList.length} Components
            </span>
          </div>

          <div className="bg-[#0a0a1a] border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-3 divide-y divide-white/5">
              {hardwareList.length === 0 ? (
                <div className="py-4 text-center text-xs text-gray-500">
                  No hardware components added yet. Use the field below to add parts.
                </div>
              ) : (
                hardwareList.map((item, idx) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-gray-500">{idx + 1}.</span>
                      <span className="font-medium text-white">{item.name}</span>
                      {item.isExtraLeg && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                          Extra Leg
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setHardwareList((prev) => prev.filter((h) => h.id !== item.id))}
                      className="text-gray-500 hover:text-rose-400 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 bg-white/[0.02] border-t border-white/10 flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="Hardware Component Name (e.g. Gravity Hinges, Indicator Lock, Supporting Legs)"
                value={newHwName}
                onChange={(e) => setNewHwName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddHwItem();
                  }
                }}
                className="flex-1 min-w-[240px] bg-[#121226] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7FB706]"
              />
              <button
                type="button"
                onClick={handleAddHwItem}
                className="px-4 py-2 bg-[#7FB706]/20 hover:bg-[#7FB706]/30 text-[#7FB706] rounded-xl text-xs font-bold transition min-h-[38px]"
              >
                + Add Component
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-end gap-3">
          <Link
            to="/admin/dashboard/products"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white text-xs font-semibold text-center min-h-[44px] flex items-center justify-center"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-black font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#7FB706]/20 transition min-h-[44px] disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? 'Saving Model...' : 'Create Model & Specifications'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}