import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Printer,
  Shield,
  Palette,
  Package,
  Layers,
  Star,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Info,
  Video,
  Film,
  Play,
  Eye,
} from 'lucide-react';
import { productCatalogApi } from '@/api/productCatalogApi';
import type {
  ProductCatalogModel,
  SSHardwareColor,
  ProductCategoryType,
} from '@/types/admin';

function parseVideoSource(url: string): { type: 'youtube' | 'vimeo' | 'native'; src: string } | null {
  if (!url) return null;
  const trimmed = url.trim();
  const ytMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'youtube',
      src: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?rel=0&modestbranding=1`,
    };
  }
  const vimeoMatch = trimmed.match(/(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+))/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      type: 'vimeo',
      src: `https://player.vimeo.com/video/${vimeoMatch[1]}?title=0&byline=0&portrait=0`,
    };
  }
  return {
    type: 'native',
    src: trimmed,
  };
}

const COLOR_SWATCHES: Record<SSHardwareColor, { bg: string; label: string; dot: string }> = {
  golden: {
    bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
    label: 'Golden Finish',
    dot: 'bg-gradient-to-r from-amber-400 to-yellow-500',
  },
  Black: {
    bg: 'bg-neutral-800 border-neutral-700 text-neutral-200',
    label: 'Matte Black',
    dot: 'bg-neutral-900 border border-neutral-600',
  },
  'stainless steel': {
    bg: 'bg-slate-500/10 border-slate-400/30 text-slate-300',
    label: 'Satin Stainless Steel',
    dot: 'bg-gradient-to-r from-slate-300 to-zinc-400',
  },
};

const CATEGORY_COLORS: Record<ProductCategoryType, { pill: string; text: string }> = {
  Cubicle: {
    pill: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    text: 'text-emerald-400',
  },
  Lockers: {
    pill: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    text: 'text-indigo-400',
  },
  'Urinal Partitions': {
    pill: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    text: 'text-amber-400',
  },
  'Kids Toilet': {
    pill: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    text: 'text-rose-400',
  },
};

export default function ProductModelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [model, setModel] = useState<ProductCatalogModel | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchModel() {
      if (!id) return;
      setLoading(true);
      try {
        const found = await productCatalogApi.getModelById(id);
        setModel(found);
      } catch (err) {
        console.error('Failed to load model details:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchModel();
  }, [id]);

  const handleDelete = async () => {
    if (!model) return;
    setDeleting(true);
    try {
      await productCatalogApi.deleteModel(model.id);
      alert(`Model "${model.title}" has been deleted.`);
      navigate('/admin/dashboard/products');
    } catch (err) {
      alert('Failed to delete model.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#121226] border border-white/5 rounded-3xl p-16 text-center text-gray-400 max-w-5xl mx-auto my-12">
        <div className="animate-spin w-8 h-8 border-2 border-[#7FB706] border-t-transparent rounded-full mx-auto mb-3" />
        Loading model details...
      </div>
    );
  }

  if (!model) {
    return (
      <div className="bg-[#121226] border border-white/5 rounded-3xl p-12 text-center text-gray-400 max-w-3xl mx-auto my-12 space-y-4">
        <Package className="w-10 h-10 mx-auto text-gray-500" />
        <h2 className="text-xl font-bold text-white">Model Not Found</h2>
        <p className="text-xs text-gray-400">The requested model could not be found in the catalog.</p>
        <Link
          to="/admin/dashboard/products"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#7FB706] text-black font-bold rounded-xl text-xs"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Products Catalog
        </Link>
      </div>
    );
  }

  const ssOption = model.hardwareOptions?.find((o) => o.material === 'SS Hardware');
  const nylonOption = model.hardwareOptions?.find((o) => o.material === 'Nylon Hardware');

  const allImages = Array.from(new Set([
    model.imageUrl,
    ...(model.additionalImages || [])
  ])).filter(Boolean) as string[];

  const currentPhoto = selectedPhoto || (allImages.length > 0 ? allImages[0] : model.imageUrl);

  const rawVideos = [
    ...(model.videos || []),
    ...(model.videoUrls || []),
  ].map((v) => (typeof v === 'string' ? v.trim() : '')).filter(Boolean);
  const uniqueVideos = Array.from(new Set(rawVideos));

  const effectiveSpecifications = useMemo(() => {
    const specs = model?.specifications || [];
    const hasHeight = specs.some((s) => s.label.toLowerCase().includes('height'));
    const hasDepth = specs.some((s) => s.label.toLowerCase().includes('depth') || s.label.toLowerCase().includes('size'));
    const hasDoor = specs.some((s) => s.label.toLowerCase().includes('door'));
    const hasThickness = specs.some((s) => s.label.toLowerCase().includes('thickness'));

    if (model?.category === 'Kids Toilet' && (!hasHeight || !hasDepth || !hasDoor)) {
      const merged = [...specs.filter((s) => !['category'].includes(s.label.toLowerCase()))];
      if (!hasHeight) merged.push({ label: 'Standard Height', value: '1200 mm – 1500 mm (Child-Friendly Ergonomic Height)' });
      if (!hasDepth) merged.push({ label: 'Standard Depth', value: '1200 mm – 1500 mm' });
      if (!hasDoor) merged.push({ label: 'Door Width', value: '500 mm – 600 mm (Child Ergonomic Safety Door)' });
      if (!hasThickness) merged.push({ label: 'Board Thickness', value: '12mm Solid Compact Phenolic Laminate' });
      if (!specs.some((s) => s.label.toLowerCase().includes('fire'))) merged.push({ label: 'Fire Rating', value: 'Class 1 / BS 476 Part 7' });
      if (!specs.some((s) => s.label.toLowerCase().includes('water'))) merged.push({ label: 'Water Resistance', value: '100% Moisture, Water & Humidity Proof' });
      if (!specs.some((s) => s.label.toLowerCase().includes('safety'))) merged.push({ label: 'Safety Feature', value: 'Anti-Pinch Hinge Gap & Outside Emergency Coin Release' });
      return merged;
    }
    if (model?.category === 'Cubicle' && (!hasHeight || !hasDepth || !hasDoor)) {
      const merged = [...specs.filter((s) => !['category'].includes(s.label.toLowerCase()))];
      if (!hasHeight) merged.push({ label: 'Standard Height', value: '1980 mm / 2000 mm (including 150mm floor gap)' });
      if (!hasDepth) merged.push({ label: 'Standard Depth', value: '1500 mm – 1800 mm' });
      if (!hasDoor) merged.push({ label: 'Door Width', value: '600 mm (Standard) / 900 mm (Accessible/ADA)' });
      if (!hasThickness) merged.push({ label: 'Board Thickness', value: '12mm / 18mm Solid Compact Phenolic Laminate' });
      if (!specs.some((s) => s.label.toLowerCase().includes('fire'))) merged.push({ label: 'Fire Rating', value: 'Class 1 / BS 476 Part 7' });
      if (!specs.some((s) => s.label.toLowerCase().includes('water'))) merged.push({ label: 'Water Resistance', value: '100% Moisture, Water & Humidity Proof' });
      return merged;
    }
    return specs;
  }, [model]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24">
      {/* ── Top Bar ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#121226] border border-white/5 p-4 sm:p-6 rounded-3xl">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/dashboard/products"
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition flex items-center justify-center min-h-[44px] min-w-[44px]"
            title="Back to Catalog"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${
                  CATEGORY_COLORS[model.category]?.pill || 'bg-white/10 text-white'
                }`}
              >
                {model.category}
              </span>
              <span className="text-xs text-gray-400 font-mono">ID: {model.slug}</span>
              {model.isFeatured && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1">
                  <Star className="w-3 h-3 fill-amber-300" /> Featured
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white capitalize mt-1">
              {model.title}
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl text-xs font-semibold border border-white/10 transition min-h-[44px]"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print BOM</span>
          </button>

          <Link
            to={`/admin/dashboard/products/${model.id}/edit`}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-black font-bold rounded-xl text-xs shadow-lg shadow-[#7FB706]/20 transition min-h-[44px]"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Edit Model</span>
          </Link>

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center justify-center p-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-xl text-xs font-semibold border border-rose-500/20 transition min-h-[44px] min-w-[44px]"
            title="Delete Model"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Main 2-Column Overview ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Image Showcase & Specs (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Image Box */}
          <div className="bg-[#121226] border border-white/5 rounded-3xl p-4 overflow-hidden">
            <div className="relative rounded-2xl overflow-hidden bg-black/40 aspect-[4/3] border border-white/10 group">
              <img
                src={currentPhoto}
                alt={model.title}
                className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              {allImages.length > 1 && (
                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-medium text-white/90 border border-white/10 flex items-center gap-1.5 shadow">
                  <Eye className="w-3 h-3 text-[#7FB706]" />
                  <span>{allImages.indexOf(currentPhoto) + 1} / {allImages.length}</span>
                </div>
              )}
              <div className="absolute bottom-3 left-4 right-4">
                <div className="text-white font-bold text-lg capitalize">{model.title}</div>
                <div className="text-xs text-gray-300 font-medium">{model.subtitle}</div>
              </div>
            </div>

            {/* Additional Images if available */}
            {allImages.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                {allImages.map((img, i) => {
                  const isActive = img === currentPhoto;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedPhoto(img)}
                      className={`w-16 h-16 rounded-xl overflow-hidden border shrink-0 transition-all ${
                        isActive
                          ? 'border-[#7FB706] ring-2 ring-[#7FB706]/40 scale-105'
                          : 'border-white/10 opacity-60 hover:opacity-100 hover:border-white/30'
                      }`}
                      title={`Photo ${i + 1}`}
                    >
                      <img src={img} alt={`Thumbnail ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Model Description & Specifications */}
          <div className="bg-[#121226] border border-white/5 rounded-3xl p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-gray-400">
              Description & Specifications
            </h3>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              {model.description}
            </p>

            <div className="pt-3 border-t border-white/5 space-y-2.5">
              {effectiveSpecifications.map((spec, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1">
                  <span className="text-gray-400">{spec.label}</span>
                  <span className="text-white font-medium text-right">{spec.value}</span>
                </div>
              ))}
              {model.tierCount && (
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-gray-400">Locker Tier</span>
                  <span className="text-indigo-400 font-bold font-mono">Tier: {model.tierCount}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Hardware Finishes & Itemized BOM (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Hardware Configuration Overview Banner */}
          <div className="bg-[#121226] border border-white/5 rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Palette className="w-4 h-4 text-[#7FB706]" />
                Hardware Configuration & Available Finishes
              </h2>
              <span className="text-xs text-gray-400">Pacific OEM Master</span>
            </div>

            {/* 1. Cubicle Rules: SS Hardware (3 colors) & Nylon Hardware */}
            {model.category === 'Cubicle' && (
              <div className="space-y-4">
                <p className="text-xs text-gray-300">
                  This model is engineered to support both stainless steel architectural fittings and high-impact engineered polyamide nylon hardware.
                </p>

                {/* SS Hardware Details */}
                {ssOption?.enabled && (
                  <div className="p-4 bg-black/40 border border-white/5 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        SS Hardware (Grade 304/316)
                      </span>
                      <span className="text-[11px] text-emerald-400 font-semibold">Available in 3 Finishes</span>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {(ssOption.colors || ['golden', 'Black', 'stainless steel']).map((col) => (
                        <div
                          key={col}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                            COLOR_SWATCHES[col]?.bg || 'bg-white/5 border-white/10 text-gray-300'
                          }`}
                        >
                          <span className={`w-2.5 h-2.5 rounded-full ${COLOR_SWATCHES[col]?.dot}`} />
                          <span>{COLOR_SWATCHES[col]?.label || col}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Nylon Hardware Details */}
                {nylonOption?.enabled && (
                  <div className="p-4 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                      <div>
                        <div className="text-xs font-bold text-white">Nylon Hardware (Polyamide Grade)</div>
                        <div className="text-[11px] text-gray-400">Non-corrosive, chemical & rust proof fittings</div>
                      </div>
                    </div>
                    <span className="text-[11px] px-2.5 py-1 rounded-xl bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-semibold">
                      Included
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* 2. Locker Rules: Uniform Hardware */}
            {model.category === 'Lockers' && (
              <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
                  <Shield className="w-4 h-4" />
                  Uniform Standard Heavy-Duty Locker Hardware
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  All Pacific locker models use standardized uniform hardware including heavy-duty concealed hinges, cam locks with master key overrides, ventilation louver grilles, number plates, and base plinth levelers. There are no color variations required.
                </p>
              </div>
            )}

            {/* 3. Urinal Rules: Model A extra leg */}
            {model.category === 'Urinal Partitions' && (
              <div className="space-y-3">
                {model.hasExtraLeg ? (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      Model A Exclusive: Extra Supporting Floor Leg Included
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      This model incorporates an extra adjustable floor supporting leg (100–150mm) to anchor the outer bottom edge to the floor slab, effectively preventing wall cantilever strain.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-white/5 border border-white/5 rounded-2xl text-xs text-gray-300">
                    Standard floating wall-hung cantilever mounting configuration with heavy stainless steel corner brackets.
                  </div>
                )}
              </div>
            )}

            {/* 4. Kids Toilet Rules: Child Safety Ergonomics with SS & Nylon Hardware */}
            {model.category === 'Kids Toilet' && (
              <div className="space-y-4">
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
                    <Shield className="w-4 h-4 text-rose-400" />
                    Kids Cubicle Child Safety &amp; Ergonomics
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Specially designed child-safety ergonomics: Anti-finger pinch hinge clearance, low-height doors for supervisory oversight, soft self-closing spring hinges, and exterior emergency release coin turn latch for staff safety access. Supports both Stainless Steel and vibrant Nylon safety fittings.
                  </p>
                </div>

                {/* SS Hardware Details */}
                {ssOption?.enabled && (
                  <div className="p-4 bg-black/40 border border-white/5 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        SS Hardware (Grade 304/316)
                      </span>
                      <span className="text-[11px] text-emerald-400 font-semibold">Available in 3 Finishes</span>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {(ssOption.colors || ['golden', 'Black', 'stainless steel']).map((col) => (
                        <div
                          key={col}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                            COLOR_SWATCHES[col]?.bg || 'bg-white/5 border-white/10 text-gray-300'
                          }`}
                        >
                          <span className={`w-2.5 h-2.5 rounded-full ${COLOR_SWATCHES[col]?.dot}`} />
                          <span>{COLOR_SWATCHES[col]?.label || col}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Nylon Safety Hardware Details */}
                {nylonOption?.enabled && (
                  <div className="p-4 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                      <div>
                        <div className="text-xs font-bold text-white">Nylon Safety Hardware (Polyamide Grade)</div>
                        <div className="text-[11px] text-gray-400">Soft-closing spring hinges &amp; non-pinching rounded profiles</div>
                      </div>
                    </div>
                    <span className="text-[11px] px-2.5 py-1 rounded-xl bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-semibold">
                      Included
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Itemized Hardware Bill of Materials (BOM) Table ── */}
          <div className="bg-[#121226] border border-white/5 rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#7FB706]" />
                  Itemized Hardware Bill of Materials (BOM)
                </h2>
                <p className="text-xs text-gray-400">Complete parts required for assembling this model</p>
              </div>
              <span className="text-xs font-mono text-[#7FB706] bg-[#7FB706]/10 px-2.5 py-1 rounded-xl border border-[#7FB706]/20 font-bold">
                {model.hardwareList?.length || 0} Parts
              </span>
            </div>

            <div className="border border-white/10 rounded-2xl overflow-hidden bg-[#0a0a1a]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-gray-400 font-semibold">
                    <th className="px-4 py-3 w-12">#</th>
                    <th className="px-4 py-3">Component Name</th>
                    <th className="px-4 py-3">Technical Specification / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {model.hardwareList?.map((hw, idx) => (
                    <tr key={hw.id || idx} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-mono text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold text-white">
                        <div className="flex items-center gap-1.5">
                          {hw.name}
                          {hw.isExtraLeg && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                              Extra Leg
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-[11px]">{hw.notes || 'Standard OEM Part'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ── DEMONSTRATION & WALKTHROUGH VIDEOS ─────────────────── */}
      {uniqueVideos.length > 0 && (
        <div className="bg-[#121226] border border-white/5 rounded-3xl p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Video className="w-4 h-4 text-[#7FB706]" />
                Demonstration & Walkthrough Videos ({uniqueVideos.length})
              </h2>
              <p className="text-xs text-gray-400">
                Live 360° architectural walkthrough and step-by-step hardware installation guides linked with this model
              </p>
            </div>
            <span className="text-xs font-mono text-[#7FB706] bg-[#7FB706]/10 px-2.5 py-1 rounded-xl border border-[#7FB706]/20 font-bold">
              {uniqueVideos.length} Video{uniqueVideos.length > 1 ? 's' : ''} Linked
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {uniqueVideos.map((vidUrl, idx) => {
              const defaultTitles = [
                'Video #1: Architectural Walkthrough / 360° Tour',
                'Video #2: Hardware & Step-by-Step Installation',
                'Video #3: Additional Demonstration',
              ];
              const videoTitle = defaultTitles[idx] || `Demonstration Video #${idx + 1}`;
              const parsed = parseVideoSource(vidUrl);
              if (!parsed) return null;

              return (
                <div
                  key={idx}
                  className="bg-[#0a0a1a] border border-white/10 rounded-2xl p-4 space-y-3 flex flex-col justify-between hover:border-[#7FB706]/30 transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5 text-[#7FB706]" />
                      {videoTitle}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {parsed.type === 'youtube' ? 'YouTube HD' : parsed.type === 'vimeo' ? 'Vimeo' : 'Direct MP4'}
                    </span>
                  </div>

                  <div className="relative rounded-xl overflow-hidden aspect-video bg-black/80 border border-white/10 shadow-inner">
                    {parsed.type === 'native' ? (
                      <video src={parsed.src} controls playsInline className="w-full h-full object-contain" />
                    ) : (
                      <iframe
                        src={parsed.src}
                        title={videoTitle}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full border-0"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ──────────────────────────── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#121226] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-white">Delete Model?</h3>
              <p className="text-xs text-gray-300">
                Are you sure you want to permanently delete <span className="text-white font-bold">"{model.title}"</span>?
              </p>
              <p className="text-xs text-rose-400 font-semibold mt-2">
                This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-semibold min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/20 min-h-[44px] transition disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
