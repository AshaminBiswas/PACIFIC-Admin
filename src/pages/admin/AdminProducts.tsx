import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  X,
  Upload,
  Eye,
  Star,
  StarOff,
  Check,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Layers,
  Box,
  LayoutGrid,
  Table as TableIcon,
  Printer,
  Info,
  Shield,
  Palette,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Image as ImageIcon,
  Video,
  Film,
  Play,
} from 'lucide-react';
import { uploadImage, uploadMultipleImages, uploadVideo } from '@/lib/supabase';
import { productCatalogApi } from '@/api/productCatalogApi';
import OpenAIGalleryModal from '@/components/common/OpenAIGalleryModal';
import type {
  ProductCatalogModel,
  TopProductCategory,
  ProductCategoryType,
  ModelHardwareItem,
  ModelHardwareOption,
  SSHardwareColor,
} from '@/types/admin';

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

function toSlug(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const SS_COLORS: SSHardwareColor[] = ['golden', 'Black', 'stainless steel'];

const COLOR_SWATCHES: Record<SSHardwareColor, { bg: string; text: string; label: string; dot: string }> = {
  golden: {
    bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
    text: 'text-amber-400',
    label: 'Golden',
    dot: 'bg-gradient-to-r from-amber-400 to-yellow-500',
  },
  Black: {
    bg: 'bg-neutral-800 border-neutral-700 text-neutral-200',
    text: 'text-neutral-300',
    label: 'Black',
    dot: 'bg-neutral-900 border border-neutral-600',
  },
  'stainless steel': {
    bg: 'bg-slate-500/10 border-slate-400/30 text-slate-300',
    text: 'text-slate-300',
    label: 'Stainless Steel',
    dot: 'bg-gradient-to-r from-slate-300 to-zinc-400',
  },
};

const CATEGORY_COLORS: Record<ProductCategoryType, { pill: string; border: string; text: string }> = {
  Cubicle: {
    pill: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
  },
  Lockers: {
    pill: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    border: 'border-indigo-500/30',
    text: 'text-indigo-400',
  },
  'Urinal Partitions': {
    pill: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
  },
  'Kids Toilet': {
    pill: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    border: 'border-rose-500/30',
    text: 'text-rose-400',
  },
};

export default function AdminProducts() {
  // â”€â”€ Data State â”€â”€
  const [categories, setCategories] = useState<TopProductCategory[]>([]);
  const [models, setModels] = useState<ProductCatalogModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ProductCategoryType>('Cubicle');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // â”€â”€ Modals State â”€â”€
  const [showModelModal, setShowModelModal] = useState(false);
  const [editingModel, setEditingModel] = useState<ProductCatalogModel | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TopProductCategory | null>(null);
  const [viewingBomModel, setViewingBomModel] = useState<ProductCatalogModel | null>(null);
  const [deleteConfirmModel, setDeleteConfirmModel] = useState<ProductCatalogModel | null>(null);

  // â”€â”€ Form State â”€â”€
  const [formCategory, setFormCategory] = useState<ProductCategoryType>('Cubicle');
  const [formTitle, setFormTitle] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formIsFeatured, setFormIsFeatured] = useState(false);
  const [formPublished, setFormPublished] = useState(true);
  const [formSortOrder, setFormSortOrder] = useState(1);

  // Cubicle-specific form states
  const [formSsEnabled, setFormSsEnabled] = useState(true);
  const [formSsColors, setFormSsColors] = useState<SSHardwareColor[]>(['golden', 'Black', 'stainless steel']);
  const [formNylonEnabled, setFormNylonEnabled] = useState(false);
  const [formAluminiumEnabled, setFormAluminiumEnabled] = useState(false);

  // Locker-specific form states
  const [formTierCount, setFormTierCount] = useState<string | number>(1);

  // Urinal-specific form states
  const [formHasExtraLeg, setFormHasExtraLeg] = useState(false);

  // Hardware items builder
  const [formHardwareList, setFormHardwareList] = useState<ModelHardwareItem[]>([]);
  const [newHwName, setNewHwName] = useState('');
  const [newHwQty, setNewHwQty] = useState<number>(1);
  const [newHwUnit, setNewHwUnit] = useState('Pc');
  const [newHwNotes, setNewHwNotes] = useState('');
  const [newHwIsLeg, setNewHwIsLeg] = useState(false);

  // Image Upload state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Multi-image and Video states for modal
  const [formAdditionalImages, setFormAdditionalImages] = useState<string[]>([]);
  const [formNewImageUrl, setFormNewImageUrl] = useState('');
  const [formUploadingMultiple, setFormUploadingMultiple] = useState(false);
  const [showFormAiModal, setShowFormAiModal] = useState(false);
  const formMultiFileInputRef = useRef<HTMLInputElement>(null);

  const [formVideos, setFormVideos] = useState<string[]>(['', '']);
  const [formUploadingVideoIdx, setFormUploadingVideoIdx] = useState<number | null>(null);
  const formVideoInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  // Category Edit Form state
  const [catName, setCatName] = useState('');
  const [catTagline, setCatTagline] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catImageUrl, setCatImageUrl] = useState('');
  const [uploadingCatImage, setUploadingCatImage] = useState(false);
  const catFileInputRef = useRef<HTMLInputElement>(null);

  // Action status message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // â”€â”€ Load Data â”€â”€
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('pacific_product_catalog_models_v1');
        localStorage.removeItem('pacific_product_catalog_models_v2');
        localStorage.removeItem('pacific_product_catalog_models_v3');
      }
      const cats = productCatalogApi.getCategories();
      setCategories(cats);

      const allModels = await productCatalogApi.listModels();
      setModels(allModels);
    } catch (err) {
      console.error('Error loading product catalog:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // â”€â”€ Filtered Models â”€â”€
  const filteredModels = useMemo(() => {
    return models.filter((m) => {
      const matchesTab = m.category === activeTab;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        m.title.toLowerCase().includes(q) ||
        m.subtitle.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.hardwareList.some((h) => h.name.toLowerCase().includes(q));
      return matchesTab && matchesSearch;
    });
  }, [models, activeTab, search]);

  // â”€â”€ Model Count Metrics â”€â”€
  const metrics = useMemo(() => {
    const cubicleCount = models.filter((m) => m.category === 'Cubicle').length;
    const lockerCount = models.filter((m) => m.category === 'Lockers').length;
    const urinalCount = models.filter((m) => m.category === 'Urinal Partitions').length;
    const kidsCount = models.filter((m) => m.category === 'Kids Toilet').length;
    return {
      total: models.length,
      cubicle: cubicleCount,
      lockers: lockerCount,
      urinal: urinalCount,
      kids: kidsCount,
    };
  }, [models]);

  // â”€â”€ Open Create Modal â”€â”€
  const handleOpenCreate = (preselectedCategory?: ProductCategoryType) => {
    const targetCat = preselectedCategory || activeTab;
    setEditingModel(null);
    setFormCategory(targetCat);
    setFormTitle('');
    setFormSlug('');
    setFormSubtitle('');
    setFormDescription('');
    setFormImageUrl(
      targetCat === 'Cubicle'
        ? 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80'
        : targetCat === 'Lockers'
        ? 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80'
        : targetCat === 'Urinal Partitions'
        ? 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=800&q=80'
        : 'https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&w=800&q=80'
    );
    setFormIsFeatured(false);
    setFormPublished(true);
    setFormSortOrder(models.length + 1);
    setFormAdditionalImages([]);
    setFormNewImageUrl('');
    setFormVideos(['', '']);

    // Hardware defaults based on category
    setFormSsEnabled(true);
    setFormSsColors(['golden', 'Black', 'stainless steel']);
    setFormNylonEnabled(false);
    setFormAluminiumEnabled(false);
    setFormTierCount(1);
    setFormHasExtraLeg(false);

    // Initial hardware items
    if (targetCat === 'Cubicle') {
      setFormHardwareList([
        { id: '1', name: 'Gravity Hinges (Rise & Fall Pair)', quantity: 2, unit: 'Pair', material: 'Both' },
        { id: '2', name: 'Occupancy Indicator Lock & Turn Bolt', quantity: 1, unit: 'Set', material: 'Both' },
        { id: '3', name: 'Door Pull Handle / Knob', quantity: 1, unit: 'Pc', material: 'Both' },
        { id: '4', name: 'Coat Hook with Rubber Buffer Stop', quantity: 1, unit: 'Pc', material: 'Both' },
        { id: '5', name: 'Adjustable Supporting Legs (100â€“150mm)', quantity: 2, unit: 'Pcs', material: 'Both' },
        { id: '6', name: 'Continuous Top Headrail Stabilizer Bar', quantity: 1, unit: 'Bar', material: 'Both' },
        { id: '7', name: 'Wall Fixing U-Channels & Fasteners Pack', quantity: 6, unit: 'Pcs', material: 'Both' },
      ]);
    } else if (targetCat === 'Lockers') {
      setFormHardwareList([
        { id: '1', name: 'Heavy-Duty Concealed Pivot Hinges', quantity: 2, unit: 'Pcs', material: 'Standard' },
        { id: '2', name: 'Locker Cam Lock with 2 Master Keys', quantity: 1, unit: 'Set', material: 'Standard' },
        { id: '3', name: 'Locker Door Number Plate Holder', quantity: 1, unit: 'Pc', material: 'Standard' },
        { id: '4', name: 'Air Ventilation Louver Grille', quantity: 1, unit: 'Set', material: 'Standard' },
        { id: '5', name: 'Interior Clothes & Hat Hook', quantity: 1, unit: 'Pc', material: 'Standard' },
        { id: '6', name: 'Base Plinth Leveler Legs', quantity: 4, unit: 'Pcs', material: 'Standard' },
      ]);
    } else if (targetCat === 'Urinal Partitions') {
      setFormHardwareList([
        { id: '1', name: 'Heavy Duty Wall Mounting Corner L-Clamps', quantity: 3, unit: 'Pcs', material: 'Standard' },
        { id: '2', name: 'SS Wall Fixing Screws, Anchors & Caps Pack', quantity: 1, unit: 'Pack', material: 'Standard' },
      ]);
    } else {
      setFormHardwareList([
        { id: '1', name: 'Nylon Safety Spring Hinges (Soft & Self-Closing)', quantity: 2, unit: 'Pair', material: 'Both' },
        { id: '2', name: 'Emergency Release Coin Latch / Safety Turn Lock', quantity: 1, unit: 'Set', material: 'Both' },
        { id: '3', name: 'Ergonomic Rounded Child Door Knob', quantity: 1, unit: 'Pc', material: 'Both' },
        { id: '4', name: 'Safety Coat & Bag Hook with Soft Buffer', quantity: 1, unit: 'Pc', material: 'Both' },
        { id: '5', name: 'Adjustable Floor Support Legs (100â€“150mm)', quantity: 2, unit: 'Pcs', material: 'Both' },
        { id: '6', name: 'Top Stabilizing Continuous Headrail Bar', quantity: 1, unit: 'Bar', material: 'Both' },
        { id: '7', name: 'Wall Fixing U-Channels & Anti-Tamper Fasteners', quantity: 6, unit: 'Pcs', material: 'Both' },
      ]);
    }

    setImageUploadError('');
    setShowModelModal(true);
  };

  // â”€â”€ Open Edit Modal â”€â”€
  const handleOpenEdit = (model: ProductCatalogModel) => {
    setEditingModel(model);
    setFormCategory(model.category);
    setFormTitle(model.title);
    setFormSlug(model.slug);
    setFormSubtitle(model.subtitle);
    setFormDescription(model.description);
    setFormImageUrl(model.imageUrl);
    setFormAdditionalImages(model.additionalImages ? [...model.additionalImages] : []);
    setFormNewImageUrl('');

    const rawVids = model.videos || model.videoUrls || [];
    if (rawVids.length >= 2) {
      setFormVideos([...rawVids]);
    } else if (rawVids.length === 1) {
      setFormVideos([rawVids[0], '']);
    } else {
      setFormVideos(['', '']);
    }

    setFormIsFeatured(Boolean(model.isFeatured));
    setFormPublished(model.published !== undefined ? model.published : true);
    setFormSortOrder(model.sortOrder ?? 0);

    // Hardware setup
    const ssOpt = model.hardwareOptions?.find((o) => o.material === 'SS Hardware');
    const nylonOpt = model.hardwareOptions?.find((o) => o.material === 'Nylon Hardware');
    const alumOpt = model.hardwareOptions?.find((o) => o.material === 'Aluminium Profile');
    setFormSsEnabled(Boolean(ssOpt?.enabled));
    setFormSsColors(ssOpt?.colors || ['golden', 'Black', 'stainless steel']);
    setFormNylonEnabled(Boolean(nylonOpt?.enabled));
    setFormAluminiumEnabled(Boolean(alumOpt?.enabled));
    setFormTierCount(model.tierCount || 1);
    setFormHasExtraLeg(Boolean(model.hasExtraLeg));

    setFormHardwareList(model.hardwareList ? [...model.hardwareList] : []);
    setImageUploadError('');
    setShowModelModal(true);
  };

  const handleFormMultipleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setFormUploadingMultiple(true);
    setImageUploadError('');
    try {
      const urls = await uploadMultipleImages(Array.from(files), 'products');
      if (urls.length > 0) {
        setFormAdditionalImages((prev) => [...prev, ...urls]);
        if (!formImageUrl) {
          setFormImageUrl(urls[0]);
        }
      }
    } catch (err: any) {
      console.warn('Batch images upload warning:', err);
      setImageUploadError(err.message || 'Error uploading multiple images');
    } finally {
      setFormUploadingMultiple(false);
      if (formMultiFileInputRef.current) formMultiFileInputRef.current.value = '';
    }
  };

  const handleFormAddDirectImageUrl = () => {
    if (!formNewImageUrl.trim()) return;
    const url = formNewImageUrl.trim();
    if (!formImageUrl) {
      setFormImageUrl(url);
    } else {
      setFormAdditionalImages((prev) => [...prev, url]);
    }
    setFormNewImageUrl('');
  };

  const handleFormSetMainImage = (img: string) => {
    if (img === formImageUrl) return;
    const oldMain = formImageUrl;
    setFormImageUrl(img);
    setFormAdditionalImages((prev) => [oldMain, ...prev.filter((item) => item !== img)]);
  };

  const handleFormRemoveImage = (img: string) => {
    if (img === formImageUrl) {
      if (formAdditionalImages.length > 0) {
        setFormImageUrl(formAdditionalImages[0]);
        setFormAdditionalImages((prev) => prev.slice(1));
      } else {
        setFormImageUrl('');
      }
    } else {
      setFormAdditionalImages((prev) => prev.filter((item) => item !== img));
    }
  };

  const handleFormVideoChange = (idx: number, val: string) => {
    setFormVideos((prev) => {
      const copy = [...prev];
      copy[idx] = val;
      return copy;
    });
  };

  const handleFormAddVideoSlot = () => {
    setFormVideos((prev) => [...prev, '']);
  };

  const handleFormRemoveVideoSlot = (idx: number) => {
    if (formVideos.length <= 2) {
      setFormVideos((prev) => {
        const copy = [...prev];
        copy[idx] = '';
        return copy;
      });
      return;
    }
    setFormVideos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleFormDirectVideoUpload = async (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFormUploadingVideoIdx(idx);
    try {
      const url = await uploadVideo(file, 'videos');
      if (url) {
        handleFormVideoChange(idx, url);
      }
    } catch (err: any) {
      console.warn('Video upload notice:', err);
      alert(err.message || 'Failed to upload video');
    } finally {
      setFormUploadingVideoIdx(null);
      if (formVideoInputRefs.current[idx]) {
        formVideoInputRefs.current[idx]!.value = '';
      }
    }
  };

  // â”€â”€ Image Upload Handler â”€â”€
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setImageUploadError('');

    try {
      // 1. Direct preview fallback via FileReader immediately
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) setFormImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);

      // 2. Upload to Supabase 'products' bucket
      const uploadedUrl = await uploadImage(file, 'products');
      if (uploadedUrl) {
        setFormImageUrl(uploadedUrl);
      }
    } catch (err: any) {
      console.warn('Image upload error:', err);
      setImageUploadError(err.message || 'Image preview applied locally');
    } finally {
      setUploadingImage(false);
    }
  };

  // â”€â”€ Category Image Upload Handler â”€â”€
  const handleCategoryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCatImage(true);
    try {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) setCatImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);

      const uploadedUrl = await uploadImage(file, 'products');
      if (uploadedUrl) {
        setCatImageUrl(uploadedUrl);
      }
    } catch (err: any) {
      console.warn('Category image upload notice:', err);
    } finally {
      setUploadingCatImage(false);
    }
  };

  // â”€â”€ Hardware List Add Item â”€â”€
  const handleAddHardwareItem = () => {
    if (!newHwName.trim()) return;

    const item: ModelHardwareItem = {
      id: `hw-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: newHwName.trim(),
      quantity: Number(newHwQty) || 1,
      unit: newHwUnit.trim() || 'Pc',
      material: formCategory === 'Cubicle' ? 'Both' : 'Standard',
      notes: newHwNotes.trim() || undefined,
      isExtraLeg: formCategory === 'Urinal Partitions' && newHwIsLeg,
    };

    setFormHardwareList((prev) => [...prev, item]);
    setNewHwName('');
    setNewHwQty(1);
    setNewHwUnit('Pc');
    setNewHwNotes('');
    setNewHwIsLeg(false);
  };

  const handleRemoveHardwareItem = (id: string) => {
    setFormHardwareList((prev) => prev.filter((item) => item.id !== id));
  };

  // â”€â”€ Urinal Model A Toggle Sync â”€â”€
  const handleToggleUrinalExtraLeg = (enabled: boolean) => {
    setFormHasExtraLeg(enabled);
    if (enabled) {
      // Ensure the extra leg item exists in the hardware list
      const hasLegItem = formHardwareList.some((h) => h.isExtraLeg || h.name.toLowerCase().includes('leg'));
      if (!hasLegItem) {
        setFormHardwareList((prev) => [
          {
            id: `hw-leg-${Date.now()}`,
            name: 'Adjustable Supporting Floor Leg (100â€“150mm)',
            quantity: 1,
            unit: 'Pc',
            material: 'Standard',
            isExtraLeg: true,
            notes: 'Extra bottom supporting leg (Exclusive to Model A)',
          },
          ...prev,
        ]);
      }
    } else {
      // Remove extra leg item if turned off
      setFormHardwareList((prev) => prev.filter((h) => !h.isExtraLeg));
    }
  };

  // â”€â”€ Save Model Handler â”€â”€
  const handleSaveModel = async () => {
    if (!formTitle.trim()) {
      alert('Please enter a model title');
      return;
    }

    const slug = formSlug.trim() ? toSlug(formSlug) : `${toSlug(formCategory)}-${toSlug(formTitle)}`;
    const id = editingModel ? editingModel.id : `model-${toSlug(formCategory)}-${toSlug(formTitle)}-${Date.now()}`;

    // Build hardwareOptions according to category rules
    const hardwareOptions: ModelHardwareOption[] = [];
    if (formCategory === 'Cubicle') {
      if (formSsEnabled) {
        hardwareOptions.push({
          material: 'SS Hardware',
          enabled: true,
          colors: formSsColors.length > 0 ? formSsColors : ['golden', 'Black', 'stainless steel'],
        });
      }
      if (formNylonEnabled) {
        hardwareOptions.push({
          material: 'Nylon Hardware',
          enabled: true,
          colors: [],
        });
      }
      if (formAluminiumEnabled) {
        hardwareOptions.push({
          material: 'Aluminium Profile',
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

    const modelData: ProductCatalogModel = {
      id,
      slug,
      title: formTitle.trim(),
      category: formCategory,
      subtitle: formSubtitle.trim() || `${formCategory} Model`,
      description: formDescription.trim() || `${formTitle} model engineered by Pacific Restroom Cubicles.`,
      imageUrl: formImageUrl || 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
      additionalImages: formAdditionalImages.filter(Boolean),
      videos: formVideos.map((v) => (typeof v === 'string' ? v.trim() : '')).filter(Boolean),
      videoUrls: formVideos.map((v) => (typeof v === 'string' ? v.trim() : '')).filter(Boolean),
      colors: editingModel?.colors,
      hardwareOptions,
      hardwareList: formHardwareList,
      specifications: editingModel?.specifications || [
        { label: 'Board Thickness', value: '12mm / 18mm Compact Laminate' },
        { label: 'Category', value: formCategory },
      ],
      features: editingModel?.features || [
        '10-Year Compact Board Warranty',
        '1-Year Hardware Replacement Warranty',
        '100% Water, Moisture & Termite Proof',
        'Heavy Duty Commercial Grade Hardware',
        'Pan-India Supply & Installation Certified',
      ],
      applications: editingModel?.applications || [
        `Commercial ${formCategory}`,
        'Corporate IT Parks & Offices',
        'Public Washrooms',
      ],
      hasExtraLeg: formCategory === 'Urinal Partitions' ? formHasExtraLeg : false,
      tierCount: formCategory === 'Lockers' ? formTierCount : undefined,
      sortOrder: formSortOrder,
      published: formPublished,
      isFeatured: formIsFeatured,
    };

    await productCatalogApi.saveModel(modelData);
    setShowModelModal(false);
    showToast(editingModel ? `Model "${formTitle}" updated successfully!` : `New model "${formTitle}" created!`);
    loadData();
  };

  // â”€â”€ Toggle Featured Handler â”€â”€
  const handleToggleFeatured = async (model: ProductCatalogModel) => {
    const nextFeatured = !model.isFeatured;
    // Optimistic UI update
    setModels((prev) =>
      prev.map((m) => (m.id === model.id ? { ...m, isFeatured: nextFeatured } : m))
    );

    try {
      await productCatalogApi.toggleFeatured(model.id, nextFeatured);
      showToast(
        nextFeatured
          ? `Model "${model.title}" marked as Featured on Homepage!`
          : `Model "${model.title}" removed from Featured.`
      );
    } catch (err: any) {
      // Revert optimistic update on failure
      setModels((prev) =>
        prev.map((m) => (m.id === model.id ? { ...m, isFeatured: model.isFeatured } : m))
      );
      alert(err.message || 'Failed to update featured status');
    }
  };

  // â”€â”€ Delete Model Handler â”€â”€
  const handleDeleteModel = async () => {
    if (!deleteConfirmModel) return;
    await productCatalogApi.deleteModel(deleteConfirmModel.id);
    setDeleteConfirmModel(null);
    showToast(`Model "${deleteConfirmModel.title}" deleted.`);
    loadData();
  };

  // â”€â”€ Open Category Edit Modal â”€â”€
  const handleOpenCategoryEdit = (cat: TopProductCategory) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatTagline(cat.tagline);
    setCatDesc(cat.description);
    setCatImageUrl(cat.imageUrl);
    setShowCategoryModal(true);
  };

  const handleSaveCategory = () => {
    if (!editingCategory) return;
    productCatalogApi.updateCategory(editingCategory.key, {
      name: catName,
      tagline: catTagline,
      description: catDesc,
      imageUrl: catImageUrl,
    });
    setShowCategoryModal(false);
    showToast(`Product line "${catName}" updated.`);
    loadData();
  };

  const handleRefresh = () => {
    loadData();
    showToast('Product catalog refreshed.');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-[#7FB706] text-black font-semibold rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* â”€â”€ Top Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-[#121226] border border-white/5 p-5 sm:p-6 rounded-3xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#7FB706]/10 text-[#7FB706] rounded-xl border border-[#7FB706]/20">
              <Package className="w-6 h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Products & Models Management
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-400">
            Configure Pacificâ€™s core product lines: <span className="text-emerald-400 font-medium">Cubicle</span>, <span className="text-indigo-400 font-medium">Lockers</span>, <span className="text-amber-400 font-medium">Urinal Partitions</span>, and <span className="text-rose-400 font-medium">Kids Cubicle</span> with complete hardware BOMs and image uploads.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleRefresh}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl text-xs font-semibold border border-white/10 transition min-h-[44px]"
            title="Refresh product catalog"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#7FB706]" />
            <span>Refresh</span>
          </button>

          <Link
            to={`/admin/dashboard/products/new?category=${encodeURIComponent(activeTab)}`}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-black font-bold rounded-xl text-sm shadow-lg shadow-[#7FB706]/20 transition min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Model</span>
          </Link>
        </div>
      </div>

      {/* â”€â”€ Active Category Overview Banner (when category tab selected) â”€â”€ */}
      {(true) && (
        (() => {
          const currentCat = categories.find((c) => c.key === activeTab);
          if (!currentCat) return null;
          return (
            <div className="relative overflow-hidden bg-gradient-to-r from-[#121226] to-[#0a0a1a] border border-white/10 rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 z-10">
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border border-white/10 bg-black/40 shrink-0 shadow-lg">
                  <img
                    src={currentCat.imageUrl}
                    alt={currentCat.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${CATEGORY_COLORS[currentCat.key].pill}`}>
                      {currentCat.key}
                    </span>
                    <span className="text-xs text-gray-400">
                      {models.filter((m) => m.category === currentCat.key).length} Active Models
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">{currentCat.name}</h2>
                  <p className="text-xs sm:text-sm text-gray-300">{currentCat.tagline}</p>
                  <p className="text-xs text-gray-400 line-clamp-2">{currentCat.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 z-10 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleOpenCategoryEdit(currentCat)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-3.5 py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl text-xs font-semibold border border-white/10 min-h-[44px] transition"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit Product Cover</span>
                </button>
                <Link
                  to={`/admin/dashboard/products/new?category=${encodeURIComponent(currentCat.key)}`}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-black font-bold rounded-xl text-xs min-h-[44px] transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add {currentCat.key} Model</span>
                </Link>
              </div>

              {/* Background ambient glow */}
              <div className="absolute -right-20 -bottom-20 w-72 h-72 bg-[#7FB706]/5 rounded-full blur-3xl pointer-events-none" />
            </div>
          );
        })()
      )}

      {/* â”€â”€ Product Lines Tab Navigation & Controls â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[#121226] border border-white/5 rounded-2xl overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('Cubicle')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition min-h-[40px] shrink-0 ${
              activeTab === 'Cubicle'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>1. Cubicle</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-normal">SS / Nylon</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('Lockers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition min-h-[40px] shrink-0 ${
              activeTab === 'Lockers'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>2. Lockers</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-normal">Uniform Hardware</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('Urinal Partitions')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition min-h-[40px] shrink-0 ${
              activeTab === 'Urinal Partitions'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>3. Urinal Partitions</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-normal">Model A Leg</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('Kids Toilet')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition min-h-[40px] shrink-0 ${
              activeTab === 'Kids Toilet'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>4. Kids Cubicle</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-normal">Safety Design</span>
          </button>
        </div>

        {/* Search & View Switcher */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search models or hardware..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#121226] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[44px]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center bg-[#121226] border border-white/5 rounded-xl p-1 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-lg transition ${
                viewMode === 'cards' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
              }`}
              title="Visual Cards View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition ${
                viewMode === 'table' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
              }`}
              title="Table View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* â”€â”€ Main Content Area â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {loading ? (
        <div className="bg-[#121226] border border-white/5 rounded-3xl p-16 text-center text-gray-400">
          <div className="animate-spin w-8 h-8 border-2 border-[#7FB706] border-t-transparent rounded-full mx-auto mb-3" />
          Loading Pacific Product Models...
        </div>
      ) : filteredModels.length === 0 ? (
        <div className="bg-[#121226] border border-white/5 rounded-3xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-white/5 mx-auto flex items-center justify-center text-gray-400">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">
            {search ? 'No matching models' : `No ${activeTab} models added yet`}
          </h3>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            {search
              ? `No models matching "${search}".`
              : `Start configuring your ${activeTab} catalog with custom hardware options, specifications, and images using the model builder.`}
          </p>
          <div className="flex justify-center gap-3">
            {search ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="px-4 py-2 bg-white/5 text-gray-300 rounded-xl text-xs font-semibold"
              >
                Clear Search
              </button>
            ) : (
              <Link
                to={`/admin/dashboard/products/new?category=${encodeURIComponent(activeTab)}`}
                className="px-5 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-black font-bold rounded-xl text-xs inline-flex items-center gap-2 transition shadow-lg shadow-[#7FB706]/20"
              >
                <Plus className="w-4 h-4" />
                <span>Create First {activeTab} Model</span>
              </Link>
            )}
          </div>
        </div>
      ) : viewMode === 'cards' ? (
        // â”€â”€ Visual Cards View â”€â”€
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredModels.map((model, idx) => {
            const ssOption = model.hardwareOptions?.find((o) => o.material === 'SS Hardware');
            const nylonOption = model.hardwareOptions?.find((o) => o.material === 'Nylon Hardware');

            return (
              <div
                key={model.id}
                className="group bg-[#121226] border border-white/5 hover:border-white/20 rounded-3xl overflow-hidden transition-all duration-200 flex flex-col justify-between"
              >
                {/* Top Media & Badges */}
                <Link to={`/admin/dashboard/products/${model.id}`} className="block group/link">
                  <div className="relative h-52 bg-black/40 overflow-hidden cursor-pointer">
                    <img
                      src={model.imageUrl}
                      alt={model.title}
                      className="w-full h-full object-cover group-hover/link:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#121226] via-transparent to-black/40" />

                    {/* Category & Serial Pill */}
                    <div className="absolute top-3.5 left-3.5 flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-white font-mono text-[11px] font-bold border border-white/10">
                        #{idx + 1}
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold backdrop-blur-md border ${
                          CATEGORY_COLORS[model.category]?.pill || 'bg-white/10 text-white'
                        }`}
                      >
                        {model.category}
                      </span>
                    </div>

                    {/* Featured / Status Pill */}
                    <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5 z-10">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleToggleFeatured(model);
                        }}
                        className={`p-1.5 rounded-xl border backdrop-blur-md transition ${
                          model.isFeatured
                            ? 'bg-amber-500/30 text-amber-300 border-amber-500/50 hover:bg-amber-500/40'
                            : 'bg-black/40 text-gray-400 border-white/10 hover:text-amber-300 hover:border-amber-400/40'
                        }`}
                        title={model.isFeatured ? "Featured on Homepage (Click to Unfeature)" : "Click to mark as Featured on Homepage"}
                      >
                        <Star className={`w-3.5 h-3.5 ${model.isFeatured ? 'fill-amber-300 text-amber-300' : ''}`} />
                      </button>
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border backdrop-blur-md ${
                          model.published
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        }`}
                      >
                        {model.published ? 'Active' : 'Draft'}
                      </span>
                    </div>

                    {/* Floating Model Name at bottom of image */}
                    <div className="absolute bottom-3 left-4 right-4">
                      <h3 className="text-xl font-bold text-white capitalize drop-shadow-md group-hover/link:text-[#7FB706] transition flex items-center gap-1.5">
                        {model.title}
                        <ChevronRight className="w-4 h-4 opacity-0 group-hover/link:opacity-100 transition" />
                      </h3>
                      <p className="text-xs text-gray-300 font-medium line-clamp-1 drop-shadow-sm">
                        {model.subtitle}
                      </p>
                    </div>
                  </div>
                </Link>

                  {/* Body Content */}
                  <div className="p-5 space-y-4">
                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                      {model.description}
                    </p>

                    {/* â”€â”€ Hardware Specifications Badge Area â”€â”€ */}
                    <div className="p-3.5 bg-black/30 border border-white/5 rounded-2xl space-y-2.5">
                      <div className="flex items-center justify-between text-[11px] text-gray-400 font-medium">
                        <span className="flex items-center gap-1 text-gray-300">
                          <Palette className="w-3.5 h-3.5 text-[#7FB706]" />
                          Hardware Options:
                        </span>
                        <span className="text-gray-400">{model.hardwareList?.length || 0} Parts</span>
                      </div>

                      {/* 1. Cubicle Hardware Options */}
                      {model.category === 'Cubicle' && (
                        <div className="space-y-2">
                          {ssOption?.enabled && (
                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                              <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[11px] font-semibold">
                                SS Hardware:
                              </span>
                              {(ssOption.colors || SS_COLORS).map((col) => (
                                <span
                                  key={col}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-medium ${
                                    COLOR_SWATCHES[col]?.bg || 'bg-white/5 border-white/10 text-gray-300'
                                  }`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${COLOR_SWATCHES[col]?.dot}`} />
                                  {COLOR_SWATCHES[col]?.label || col}
                                </span>
                              ))}
                            </div>
                          )}

                          {nylonOption?.enabled && (
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[11px] font-semibold">
                                Nylon Hardware
                              </span>
                              <span className="text-[10px] text-gray-400">High-Impact Polyamide</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 2. Locker Hardware Options */}
                      {model.category === 'Lockers' && (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-1 rounded-xl bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px] font-semibold flex items-center gap-1.5">
                            <Shield className="w-3 h-3" />
                            Standard Uniform Hardware
                          </span>
                          {model.tierCount && (
                            <span className="px-2.5 py-1 rounded-xl bg-white/5 text-gray-300 border border-white/10 text-[11px] font-mono">
                              Tier: {model.tierCount}
                            </span>
                          )}
                        </div>
                      )}

                      {/* 3. Urinal Hardware Options */}
                      {model.category === 'Urinal Partitions' && (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-1 rounded-xl bg-white/5 text-gray-300 border border-white/10 text-[11px]">
                            Wall Mount Clamps
                          </span>
                          {model.hasExtraLeg ? (
                            <span className="px-2.5 py-1 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[11px] font-bold flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                              Extra Floor Leg Included
                            </span>
                          ) : (
                            <span className="text-[11px] text-gray-500">Wall Cantilever</span>
                          )}
                        </div>
                      )}

                      {/* 4. Kids Toilet Hardware Options */}
                      {model.category === 'Kids Toilet' && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2.5 py-1 rounded-xl bg-rose-500/10 text-rose-300 border border-rose-500/20 text-[11px] font-semibold flex items-center gap-1.5">
                            <Shield className="w-3 h-3" />
                            Anti-Finger Pinch Safety
                          </span>
                          {ssOption?.enabled && (
                            <span className="px-2 py-0.5 rounded-lg bg-white/5 text-gray-300 border border-white/10 text-[10px]">
                              SS Hardware
                            </span>
                          )}
                          {nylonOption?.enabled && (
                            <span className="px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[10px]">
                              Nylon Safety
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                {/* Footer Actions */}
                <div className="p-4 pt-0 border-t border-white/5 flex items-center justify-between gap-2 mt-2">
                  <Link
                    to={`/admin/dashboard/products/${model.id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl text-xs font-semibold border border-white/5 transition min-h-[40px]"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#7FB706]" />
                    <span>View Model & BOM</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleToggleFeatured(model)}
                    className={`px-2.5 py-2 rounded-xl text-xs font-semibold border transition min-h-[40px] flex items-center gap-1.5 ${
                      model.isFeatured
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                        : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-amber-300 border-white/5'
                    }`}
                    title={model.isFeatured ? "Unmark from Featured" : "Mark as Featured"}
                  >
                    <Star className={`w-3.5 h-3.5 ${model.isFeatured ? 'fill-amber-300 text-amber-300' : ''}`} />
                    <span className="hidden sm:inline">{model.isFeatured ? 'Featured' : 'Feature'}</span>
                  </button>

                  <Link
                    to={`/admin/dashboard/products/${model.id}/edit`}
                    className="p-2.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl text-xs font-semibold border border-white/5 transition min-h-[40px] min-w-[40px] flex items-center justify-center"
                    title="Edit Model"
                  >
                    <Pencil className="w-4 h-4" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => setDeleteConfirmModel(model)}
                    className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded-xl text-xs font-semibold border border-rose-500/20 transition min-h-[40px] min-w-[40px] flex items-center justify-center"
                    title="Delete Model"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // â”€â”€ Detailed Table View â”€â”€
        <div className="bg-[#121226] border border-white/5 rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-gray-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="px-4 py-3.5 w-12 text-center">#</th>
                  <th className="px-4 py-3.5 w-20">Photo</th>
                  <th className="px-4 py-3.5">Model Name & Subtitle</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Hardware Options</th>
                  <th className="px-4 py-3.5 text-center">BOM Count</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredModels.map((model, idx) => {
                  const ssOption = model.hardwareOptions?.find((o) => o.material === 'SS Hardware');
                  const nylonOption = model.hardwareOptions?.find((o) => o.material === 'Nylon Hardware');

                  return (
                    <tr key={model.id} className="hover:bg-white/[0.02] transition">
                      <td className="px-4 py-3 text-center font-mono text-gray-400">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <Link to={`/admin/dashboard/products/${model.id}`} className="block">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/40 border border-white/10 shrink-0 hover:border-[#7FB706] transition">
                            <img
                              src={model.imageUrl}
                              alt={model.title}
                              className="w-full h-full object-cover hover:scale-105 transition"
                            />
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link to={`/admin/dashboard/products/${model.id}`} className="group/name">
                          <div className="font-bold text-white text-sm capitalize group-hover/name:text-[#7FB706] transition flex items-center gap-1.5">
                            {model.title}
                            <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover/name:opacity-100 transition text-[#7FB706]" />
                          </div>
                          <div className="text-gray-400 text-xs line-clamp-1">{model.subtitle}</div>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-xl text-[11px] font-semibold border ${
                            CATEGORY_COLORS[model.category]?.pill || 'bg-white/5 text-gray-300'
                          }`}
                        >
                          {model.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {model.category === 'Cubicle' ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {ssOption?.enabled && (
                              <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px]">
                                SS (Golden, Black, SS)
                              </span>
                            )}
                            {nylonOption?.enabled && (
                              <span className="px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[10px]">
                                Nylon
                              </span>
                            )}
                          </div>
                        ) : model.category === 'Lockers' ? (
                          <span className="text-indigo-400 font-medium">Standard Uniform Hardware</span>
                        ) : model.category === 'Urinal Partitions' ? (
                          <span className={model.hasExtraLeg ? 'text-amber-400 font-bold' : 'text-gray-400'}>
                            {model.hasExtraLeg ? 'Standard + Extra Floor Leg' : 'Standard Wall Mount'}
                          </span>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 text-[10px]">
                              Safety Ergonomics
                            </span>
                            {ssOption?.enabled && <span className="text-gray-300 text-[10px]">SS</span>}
                            {nylonOption?.enabled && <span className="text-cyan-300 text-[10px]">Nylon</span>}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          to={`/admin/dashboard/products/${model.id}`}
                          className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-mono text-xs border border-white/5 inline-flex items-center gap-1.5 transition"
                        >
                          <Layers className="w-3 h-3 text-[#7FB706]" />
                          {model.hardwareList?.length || 0} Parts
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${
                            model.published
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          }`}
                        >
                          {model.published ? 'Active' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/admin/dashboard/products/${model.id}`}
                            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition"
                            title="View Model Details"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#7FB706]" />
                          </Link>
                          <Link
                            to={`/admin/dashboard/products/${model.id}/edit`}
                            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition"
                            title="Edit Model"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmModel(model)}
                            className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* â”€â”€ CREATE / EDIT MODEL MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {showModelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl bg-[#121226] border border-white/10 rounded-3xl shadow-2xl overflow-hidden my-8">
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div>
                <span className="text-xs font-semibold text-[#7FB706] tracking-wider uppercase">
                  {editingModel ? 'Edit Model' : 'New Model Configuration'}
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-white mt-0.5">
                  {editingModel ? `Editing: ${editingModel.title}` : 'Add Product Model'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowModelModal(false)}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Product Category Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  1. Select Product Line <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {(['Cubicle', 'Lockers', 'Urinal Partitions', 'Kids Toilet'] as ProductCategoryType[]).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setFormCategory(cat);
                        if (cat === 'Cubicle' && formHardwareList.length === 0) {
                          setFormHardwareList([
                            { id: '1', name: 'Gravity Hinges (Pair)', quantity: 2, unit: 'Pair', material: 'Both' },
                            { id: '2', name: 'Indicator Lock & Bolt', quantity: 1, unit: 'Set', material: 'Both' },
                            { id: '3', name: 'Pull Handle', quantity: 1, unit: 'Pc', material: 'Both' },
                            { id: '4', name: 'Coat Hook & Buffer', quantity: 1, unit: 'Pc', material: 'Both' },
                            { id: '5', name: 'Adjustable Supporting Legs', quantity: 2, unit: 'Pcs', material: 'Both' },
                          ]);
                        } else if (cat === 'Kids Toilet' && formHardwareList.length === 0) {
                          setFormHardwareList([
                            { id: '1', name: 'Nylon Safety Spring Hinges', quantity: 2, unit: 'Pair', material: 'Both' },
                            { id: '2', name: 'Emergency Release Safety Turn Lock', quantity: 1, unit: 'Set', material: 'Both' },
                            { id: '3', name: 'Ergonomic Rounded Child Door Knob', quantity: 1, unit: 'Pc', material: 'Both' },
                            { id: '4', name: 'Safety Coat Hook with Soft Buffer', quantity: 1, unit: 'Pc', material: 'Both' },
                            { id: '5', name: 'Adjustable Floor Support Legs (100â€“150mm)', quantity: 2, unit: 'Pcs', material: 'Both' },
                          ]);
                        }
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between min-h-[52px] ${
                        formCategory === cat
                          ? `${CATEGORY_COLORS[cat].border} bg-white/10 text-white font-bold ring-1 ring-[#7FB706]/40`
                          : 'border-white/10 bg-[#0a0a1a] text-gray-400 hover:text-white hover:border-white/20'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-semibold">{cat}</div>
                        <div className="text-[11px] opacity-75 font-normal">
                          {cat === 'Cubicle'
                            ? 'SS / Nylon'
                            : cat === 'Lockers'
                            ? 'Uniform H/W'
                            : cat === 'Urinal Partitions'
                            ? 'Extra Leg'
                            : 'Safety Design'}
                        </div>
                      </div>
                      {formCategory === cat && <CheckCircle2 className="w-5 h-5 text-[#7FB706]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Basic Model Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Model Name / Title <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Delight, Gusto, Tier 1 locker, model A"
                    value={formTitle}
                    onChange={(e) => {
                      setFormTitle(e.target.value);
                      if (!formSlug || formSlug === toSlug(formTitle)) {
                        setFormSlug(toSlug(e.target.value));
                      }
                    }}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Model Subtitle / Tagline
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Heavy Duty Overhead-Braced Commercial Cubicle"
                    value={formSubtitle}
                    onChange={(e) => setFormSubtitle(e.target.value)}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Detailed Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Engineered solid phenolic compact laminate solution..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                />
              </div>

              {/* â”€â”€ MULTI-PHOTO GALLERY FOR THIS MODEL â”€â”€ */}
              <div className="p-4 bg-black/40 border border-white/10 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-gray-200 flex items-center gap-1.5 uppercase tracking-wider">
                      <ImageIcon className="w-4 h-4 text-[#7FB706]" />
                      Model Photos & Multi-Photo Gallery <span className="text-rose-400">*</span>
                    </label>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Upload multiple photos for interactive display. The first photo acts as primary cover.
                    </p>
                  </div>
                  <span className="text-[11px] text-gray-400 font-mono">
                    {1 + formAdditionalImages.length} photo{1 + formAdditionalImages.length > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Upload action bar */}
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    ref={formMultiFileInputRef}
                    onChange={handleFormMultipleImagesUpload}
                    accept="image/*"
                    multiple
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => formMultiFileInputRef.current?.click()}
                    disabled={formUploadingMultiple}
                    className="px-3.5 py-2 bg-[#7FB706]/15 hover:bg-[#7FB706]/25 text-[#B5F823] border border-[#7FB706]/30 rounded-xl text-xs font-semibold flex items-center gap-2 min-h-[40px] transition disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4 text-[#7FB706]" />
                    <span>{formUploadingMultiple ? 'Uploading Photos...' : 'Upload Photos (Batch)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!formImageUrl) {
                        alert('Please select or upload a Main Cover photo first.');
                        return;
                      }
                      setShowFormAiModal(true);
                    }}
                    className="px-3.5 py-2 bg-gradient-to-r from-[#7FB706]/20 to-[#B5F823]/20 hover:from-[#7FB706]/30 hover:to-[#B5F823]/30 text-[#B5F823] border border-[#7FB706]/40 rounded-xl text-xs font-bold flex items-center gap-1.5 min-h-[40px] transition shadow-lg shadow-[#7FB706]/10"
                  >
                    <Sparkles className="w-4 h-4 text-[#B5F823]" />
                    <span>Auto-Generate 4 Angles (AI)</span>
                  </button>

                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <input
                      type="text"
                      placeholder="Or enter direct image URL (https://...)"
                      value={formNewImageUrl}
                      onChange={(e) => setFormNewImageUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleFormAddDirectImageUrl();
                        }
                      }}
                      className="flex-1 bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 min-h-[40px] focus:outline-none focus:border-[#7FB706]"
                    />
                    <button
                      type="button"
                      onClick={handleFormAddDirectImageUrl}
                      disabled={!formNewImageUrl.trim()}
                      className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold border border-white/10 transition disabled:opacity-40 min-h-[40px]"
                    >
                      Add URL
                    </button>
                  </div>
                </div>

                {imageUploadError && (
                  <div className="text-[11px] text-amber-400 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    <span>{imageUploadError}</span>
                  </div>
                )}

                {/* Thumbnails Swatches */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-1">
                  {/* Main Cover */}
                  <div className="relative rounded-xl overflow-hidden aspect-[4/3] bg-[#0a0a1a] border-2 border-[#7FB706] shadow group">
                    <img src={formImageUrl || 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80'} alt="Main Cover" className="w-full h-full object-cover" />
                    <div className="absolute top-1.5 left-1.5 bg-[#7FB706] text-black text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 shadow">
                      <Star className="w-2.5 h-2.5 fill-black" /> Main Cover
                    </div>
                    <div className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => setShowFormAiModal(true)}
                        className="px-1.5 py-0.5 bg-black/90 hover:bg-[#7FB706] text-[#B5F823] hover:text-black rounded text-[9px] font-bold transition flex items-center gap-1 border border-[#7FB706]/40"
                        title="Generate 4 Angles from this cover"
                      >
                        <Sparkles className="w-2.5 h-2.5" /> AI 4 Angles
                      </button>
                    </div>
                  </div>

                  {/* Additional Photos */}
                  {formAdditionalImages.map((img, i) => (
                    <div key={i} className="relative rounded-xl overflow-hidden aspect-[4/3] bg-[#0a0a1a] border border-white/10 group hover:border-[#7FB706]/40 transition">
                      <img src={img} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 p-1">
                        <button
                          type="button"
                          onClick={() => handleFormSetMainImage(img)}
                          className="px-1.5 py-1 bg-[#7FB706] text-black text-[9px] font-bold rounded transition hover:bg-[#6fa005]"
                          title="Set as Main Cover"
                        >
                          Set Main
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFormRemoveImage(img)}
                          className="p-1 bg-rose-600/80 text-white rounded transition hover:bg-rose-600"
                          title="Delete Photo"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* â”€â”€ DEMONSTRATION & WALKTHROUGH VIDEOS (MINIMUM 2 VIDEOS) â”€â”€ */}
              <div className="p-4 bg-black/40 border border-white/10 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-gray-200 flex items-center gap-1.5 uppercase tracking-wider">
                      <Video className="w-4 h-4 text-[#7FB706]" />
                      Demonstration & Walkthrough Videos (Minimum 2 Videos) <span className="text-rose-400">*</span>
                    </label>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Link minimum 2 videos for walkthrough and installation guides (YouTube, Vimeo, or MP4 file upload).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleFormAddVideoSlot}
                    className="inline-flex items-center gap-1 text-[11px] text-[#B5F823] bg-[#7FB706]/15 hover:bg-[#7FB706]/30 px-2.5 py-1 rounded-lg border border-[#7FB706]/30 transition"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Video</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {formVideos.map((vidUrl, idx) => {
                    const defaultSlotTitle =
                      idx === 0
                        ? 'Video #1: Walkthrough / 360Â° Tour'
                        : idx === 1
                        ? 'Video #2: Hardware & Step-by-Step Installation'
                        : `Video #${idx + 1}: Additional Showcase`;
                    const parsed = parseVideoSource(vidUrl);

                    return (
                      <div
                        key={idx}
                        className="bg-[#0a0a1a] border border-white/10 rounded-xl p-3 space-y-2.5 flex flex-col justify-between hover:border-[#7FB706]/30 transition"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                              <Film className="w-3.5 h-3.5 text-[#7FB706]" />
                              {defaultSlotTitle}
                            </span>
                            {formVideos.length > 2 && (
                              <button
                                type="button"
                                onClick={() => handleFormRemoveVideoSlot(idx)}
                                className="p-1 text-gray-400 hover:text-rose-400 transition"
                                title="Remove video slot"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          <input
                            type="text"
                            placeholder="YouTube, Vimeo, or MP4 URL (https://...)"
                            value={vidUrl}
                            onChange={(e) => handleFormVideoChange(idx, e.target.value)}
                            className="w-full bg-[#121226] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
                          />

                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              ref={(el) => (formVideoInputRefs.current[idx] = el)}
                              onChange={(e) => handleFormDirectVideoUpload(idx, e)}
                              accept="video/mp4,video/webm,video/quicktime"
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => formVideoInputRefs.current[idx]?.click()}
                              disabled={formUploadingVideoIdx === idx}
                              className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-gray-300 rounded-md text-[10px] font-medium border border-white/10 flex items-center gap-1 transition disabled:opacity-50"
                            >
                              <Upload className="w-3 h-3 text-[#7FB706]" />
                              <span>{formUploadingVideoIdx === idx ? 'Uploading...' : 'Upload Video (.mp4)'}</span>
                            </button>
                            {vidUrl && (
                              <button
                                type="button"
                                onClick={() => handleFormVideoChange(idx, '')}
                                className="text-[10px] text-rose-400 hover:underline"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Live Player Preview */}
                        <div className="relative rounded-lg overflow-hidden aspect-video bg-black/60 border border-white/10 flex items-center justify-center">
                          {parsed ? (
                            parsed.type === 'native' ? (
                              <video src={parsed.src} controls playsInline className="w-full h-full object-contain" />
                            ) : (
                              <iframe
                                src={parsed.src}
                                title={defaultSlotTitle}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="w-full h-full border-0"
                              />
                            )
                          ) : (
                            <div className="text-center p-2 text-gray-500 space-y-0.5">
                              <Play className="w-5 h-5 mx-auto opacity-30 text-gray-400" />
                              <div className="text-[10px]">No video provided yet</div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* â”€â”€ HARDWARE CONFIGURATION ACCORDING TO USER SPEC â”€â”€ */}
              <div className="p-4 bg-[#0a0a1a] border border-white/10 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#7FB706]" />
                    Hardware Options & Finishes
                  </h3>
                  <span className="text-[11px] text-gray-400">Model Specific Rules</span>
                </div>

                {/* 1. Cubicle Rule: 2 hardware options (SS Hardware & Nylon Hardware; SS has 3 colors) */}
                {formCategory === 'Cubicle' && (
                  <div className="space-y-4">
                    <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-xs text-emerald-300">
                      <strong>Cubicle Hardware Rule:</strong> Select hardware options for this model: <strong>SS Hardware</strong> (3 colors: <em>Golden, Black, Stainless Steel</em>), <strong>Nylon Hardware</strong>, and <strong>Aluminium Profile</strong>.
                    </div>

                    {/* SS Hardware Toggle & Colors */}
                    <div className="space-y-2 p-3 bg-black/30 border border-white/5 rounded-xl">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-white">
                          <input
                            type="checkbox"
                            checked={formSsEnabled}
                            onChange={(e) => setFormSsEnabled(e.target.checked)}
                            className="w-4 h-4 accent-[#7FB706] rounded cursor-pointer"
                          />
                          <span>Enable SS Hardware (Grade 304/316)</span>
                        </label>
                        <span className="text-[11px] text-gray-400">3 Available Colors</span>
                      </div>

                      {formSsEnabled && (
                        <div className="pt-2 border-t border-white/5 flex flex-wrap gap-2">
                          {SS_COLORS.map((color) => {
                            const isSelected = formSsColors.includes(color);
                            return (
                              <button
                                key={color}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    if (formSsColors.length > 1) {
                                      setFormSsColors(formSsColors.filter((c) => c !== color));
                                    }
                                  } else {
                                    setFormSsColors([...formSsColors, color]);
                                  }
                                }}
                                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition min-h-[38px] ${
                                  isSelected
                                    ? COLOR_SWATCHES[color].bg + ' ring-1 ring-white/20'
                                    : 'bg-white/5 border-white/10 text-gray-400 opacity-60'
                                }`}
                              >
                                <span className={`w-2.5 h-2.5 rounded-full ${COLOR_SWATCHES[color].dot}`} />
                                <span>{COLOR_SWATCHES[color].label}</span>
                                {isSelected && <Check className="w-3 h-3 ml-1" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Nylon Hardware Toggle */}
                    <div className="p-3 bg-black/30 border border-white/5 rounded-xl flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-white">
                        <input
                          type="checkbox"
                          checked={formNylonEnabled}
                          onChange={(e) => setFormNylonEnabled(e.target.checked)}
                          className="w-4 h-4 accent-[#7FB706] rounded cursor-pointer"
                        />
                        <span>Enable Nylon Hardware (High-Impact Polyamide)</span>
                      </label>
                      <span className="text-[11px] text-gray-400">Chemical &amp; Rust Proof</span>
                    </div>

                    {/* Aluminium Profile Toggle */}
                    <div className="p-3 bg-black/30 border border-white/5 rounded-xl flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-white">
                        <input
                          type="checkbox"
                          checked={formAluminiumEnabled}
                          onChange={(e) => setFormAluminiumEnabled(e.target.checked)}
                          className="w-4 h-4 accent-[#7FB706] rounded cursor-pointer"
                        />
                        <span>Enable Aluminium Profile (Extruded &amp; Anodized)</span>
                      </label>
                      <span className="text-[11px] text-gray-400">Structural Profiles</span>
                    </div>
                  </div>
                )}

                {/* 2. Locker Rule: Every locker uses the same hardwares, NO color options */}
                {formCategory === 'Lockers' && (
                  <div className="space-y-3">
                    <div className="p-3 bg-indigo-500/5 border border-indigo-500/20 rounded-xl text-xs text-indigo-300">
                      <strong>Locker Hardware Rule:</strong> All locker models use uniform standard heavy-duty hardware (Concealed Pivot Hinges, Key Cam Lock, Louver Grilles, Number Plates). <strong>There are no color options for locker hardware.</strong>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                          Locker Tier / Compartment Type
                        </label>
                        <select
                          value={formTierCount}
                          onChange={(e) => setFormTierCount(e.target.value)}
                          className="w-full bg-[#121226] border border-white/10 rounded-xl px-3 py-2 text-xs text-white min-h-[44px] focus:outline-none focus:border-[#7FB706]"
                        >
                          <option value="1">Tier 1 (Single Full Height Door)</option>
                          <option value="2">Tier 2 (2 Stacked Doors)</option>
                          <option value="3">Tier 3 (3 Stacked Doors)</option>
                          <option value="4">Tier 4 (4 Stacked Doors)</option>
                          <option value="5">Tier 5 (5 Stacked Doors)</option>
                          <option value="6">Tier 6 (6 Stacked Doors)</option>
                          <option value="Z-2">Z-Shape (Dual Interlocking Z Doors)</option>
                        </select>
                      </div>
                      <div className="flex items-center p-3 bg-white/5 border border-white/5 rounded-xl text-xs text-gray-300">
                        Cam Lock & Number Plate count automatically matches tier count.
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Urinal Partitions Rule: Model A uses extra hardware 'Leg', rest use same hardware */}
                {formCategory === 'Urinal Partitions' && (
                  <div className="space-y-3">
                    <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-xs text-amber-300">
                      <strong>Urinal Partition Rule:</strong> Model A includes an <strong>extra supporting floor leg</strong>, while Models B, C, and D utilize standard wall-mount cantilever hardware.
                    </div>

                    <div className="p-3 bg-black/30 border border-white/5 rounded-xl flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-white">
                        <input
                          type="checkbox"
                          checked={formHasExtraLeg}
                          onChange={(e) => handleToggleUrinalExtraLeg(e.target.checked)}
                          className="w-4 h-4 accent-[#7FB706] rounded cursor-pointer"
                        />
                        <span className="flex items-center gap-1.5">
                          Include Extra Supporting Leg (Floor Leg)
                          {formHasExtraLeg && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                              Model A Feature
                            </span>
                          )}
                        </span>
                      </label>
                      <span className="text-[11px] text-gray-400">100â€“150mm Leg</span>
                    </div>
                  </div>
                )}

                {/* 4. Kids Toilet Rule: Child Safety & Ergonomics */}
                {formCategory === 'Kids Toilet' && (
                  <div className="space-y-4">
                    <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl text-xs text-rose-300">
                      <strong>Kids Cubicle Hardware Rule:</strong> Specially designed child-safety ergonomics: Anti-finger pinch clearance, low-height doors, soft spring hinges, and exterior emergency release coin turn latch for staff safety access. Supports <strong>SS Hardware</strong> &amp; vibrant <strong>Nylon Hardware</strong> options.
                    </div>

                    {/* SS Hardware Toggle & Colors */}
                    <div className="space-y-2 p-3 bg-black/30 border border-white/5 rounded-xl">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-white">
                          <input
                            type="checkbox"
                            checked={formSsEnabled}
                            onChange={(e) => setFormSsEnabled(e.target.checked)}
                            className="w-4 h-4 accent-[#7FB706] rounded cursor-pointer"
                          />
                          <span>Enable SS Safety Hardware</span>
                        </label>
                        <span className="text-[11px] text-gray-400">3 Available Finishes</span>
                      </div>

                      {formSsEnabled && (
                        <div className="pt-2 border-t border-white/5 flex flex-wrap gap-2">
                          {SS_COLORS.map((color) => {
                            const isSelected = formSsColors.includes(color);
                            return (
                              <button
                                key={color}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    if (formSsColors.length > 1) {
                                      setFormSsColors(formSsColors.filter((c) => c !== color));
                                    }
                                  } else {
                                    setFormSsColors([...formSsColors, color]);
                                  }
                                }}
                                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition min-h-[38px] ${
                                  isSelected
                                    ? COLOR_SWATCHES[color].bg + ' ring-1 ring-white/20'
                                    : 'bg-white/5 border-white/10 text-gray-400 opacity-60'
                                }`}
                              >
                                <span className={`w-2.5 h-2.5 rounded-full ${COLOR_SWATCHES[color].dot}`} />
                                <span>{COLOR_SWATCHES[color].label}</span>
                                {isSelected && <Check className="w-3 h-3 ml-1" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Nylon Hardware Toggle */}
                    <div className="p-3 bg-black/30 border border-white/5 rounded-xl flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-white">
                        <input
                          type="checkbox"
                          checked={formNylonEnabled}
                          onChange={(e) => setFormNylonEnabled(e.target.checked)}
                          className="w-4 h-4 accent-[#7FB706] rounded cursor-pointer"
                        />
                        <span>Enable Nylon Hardware (Soft-Closing & Anti-Pinch)</span>
                      </label>
                      <span className="text-[11px] text-gray-400">Child-friendly</span>
                    </div>
                  </div>
                )}
              </div>

              {/* â”€â”€ HARDWARE LIST (BILL OF MATERIALS) BUILDER â”€â”€ */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-[#7FB706]" />
                      Model Hardware List (Bill of Materials)
                    </label>
                    <p className="text-[11px] text-gray-400">
                      Itemized hardware list required for assembling this model
                    </p>
                  </div>
                  <span className="text-xs font-mono text-[#7FB706] bg-[#7FB706]/10 px-2.5 py-1 rounded-xl border border-[#7FB706]/20">
                    {formHardwareList.length} items
                  </span>
                </div>

                {/* Table of items */}
                <div className="bg-[#0a0a1a] border border-white/10 rounded-2xl overflow-hidden">
                  {formHardwareList.length === 0 ? (
                    <div className="p-6 text-center text-xs text-gray-400">
                      No hardware items added yet. Use the inputs below to add parts.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-gray-400 bg-white/[0.02]">
                          <th className="px-3 py-2">Item Name</th>
                          <th className="px-3 py-2">Notes</th>
                          <th className="px-3 py-2 w-12 text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {formHardwareList.map((item) => (
                          <tr key={item.id} className="hover:bg-white/[0.02]">
                            <td className="px-3 py-2.5 font-medium text-white flex items-center gap-1.5">
                              {item.name}
                              {item.isExtraLeg && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                                  Extra Leg
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-gray-400 text-[11px]">{item.notes || 'â€”'}</td>
                            <td className="px-3 py-2.5 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveHardwareItem(item.id)}
                                className="text-gray-500 hover:text-rose-400 p-1 rounded transition"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {/* Add New Line Item Row */}
                  <div className="p-3 bg-white/[0.02] border-t border-white/10 flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      placeholder="Add hardware item (e.g. Gravity Hinge, Supporting Leg)"
                      value={newHwName}
                      onChange={(e) => setNewHwName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddHardwareItem();
                        }
                      }}
                      className="flex-1 min-w-[200px] bg-[#121226] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[40px]"
                    />
                    {formCategory === 'Urinal Partitions' && (
                      <label className="flex items-center gap-1.5 text-xs text-amber-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newHwIsLeg}
                          onChange={(e) => setNewHwIsLeg(e.target.checked)}
                          className="w-3.5 h-3.5 accent-amber-400 rounded"
                        />
                        <span>Is Extra Leg</span>
                      </label>
                    )}
                    <button
                      type="button"
                      onClick={handleAddHardwareItem}
                      className="px-4 py-2 bg-[#7FB706]/20 hover:bg-[#7FB706]/30 text-[#7FB706] font-bold rounded-xl text-xs min-h-[40px] transition"
                    >
                      + Add Item
                    </button>
                  </div>
                </div>
              </div>

              {/* Status & Options */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-white/10">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-white">
                    <input
                      type="checkbox"
                      checked={formPublished}
                      onChange={(e) => setFormPublished(e.target.checked)}
                      className="w-4 h-4 accent-[#7FB706] rounded cursor-pointer"
                    />
                    <span>Active / Published</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-white">
                    <input
                      type="checkbox"
                      checked={formIsFeatured}
                      onChange={(e) => setFormIsFeatured(e.target.checked)}
                      className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                    />
                    <span>Featured Model</span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Sort Order:</span>
                  <input
                    type="number"
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(Number(e.target.value))}
                    className="w-16 bg-[#0a0a1a] border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white text-center"
                  />
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-5 sm:p-6 border-t border-white/10 flex items-center justify-end gap-3 bg-white/[0.02]">
              <button
                type="button"
                onClick={() => setShowModelModal(false)}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-sm font-semibold min-h-[44px] transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveModel}
                className="px-6 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-black font-bold rounded-xl text-sm shadow-lg shadow-[#7FB706]/20 min-h-[44px] transition flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>{editingModel ? 'Save Changes' : 'Create Model'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ HARDWARE BOM DETAIL DRAWER / MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {viewingBomModel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-[#121226] border border-white/10 rounded-3xl shadow-2xl overflow-hidden my-8">
            <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/40 border border-white/10 shrink-0">
                  <img src={viewingBomModel.imageUrl} alt={viewingBomModel.title} className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-300 font-semibold">
                      {viewingBomModel.category}
                    </span>
                    <span className="text-xs text-[#7FB706] font-mono">
                      {viewingBomModel.hardwareList?.length || 0} Components
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white capitalize">{viewingBomModel.title} Hardware BOM</h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingBomModel(null)}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Hardware Option Summary */}
              <div className="p-3.5 bg-black/40 border border-white/5 rounded-2xl text-xs space-y-2">
                <div className="text-gray-400 font-medium">Finishes & Options:</div>
                {viewingBomModel.category === 'Cubicle' && (
                  <div className="flex flex-wrap items-center gap-2">
                    {viewingBomModel.hardwareOptions?.some((o) => o.material === 'SS Hardware' && o.enabled) && (
                      <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">
                        SS Hardware: Golden, Black, Stainless Steel
                      </span>
                    )}
                    {viewingBomModel.hardwareOptions?.some((o) => o.material === 'Nylon Hardware' && o.enabled) && (
                      <span className="px-2.5 py-1 rounded-xl bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-semibold">
                        Nylon Hardware
                      </span>
                    )}
                    {viewingBomModel.hardwareOptions?.some((o) => o.material === 'Aluminium Profile' && o.enabled) && (
                      <span className="px-2.5 py-1 rounded-xl bg-slate-500/10 text-slate-300 border border-slate-500/20 font-semibold">
                        Aluminium Profile
                      </span>
                    )}
                  </div>
                )}
                {viewingBomModel.category === 'Lockers' && (
                  <div className="text-indigo-300 font-semibold">
                    Standard Uniform Heavy-Duty Hardware Suite (No color variations)
                  </div>
                )}
                {viewingBomModel.category === 'Urinal Partitions' && (
                  <div className="text-amber-300 font-semibold">
                    {viewingBomModel.hasExtraLeg
                      ? 'Model A Configuration: Standard Wall Clamps + Extra Supporting Floor Leg'
                      : 'Wall Cantilever Floating Mounting Hardware'}
                  </div>
                )}
              </div>

              {/* Hardware BOM Table */}
              <div className="border border-white/10 rounded-2xl overflow-hidden bg-[#0a0a1a]">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02] text-gray-400">
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Hardware Component</th>
                      <th className="px-4 py-3">Specification / Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {viewingBomModel.hardwareList?.map((hw, idx) => (
                      <tr key={hw.id || idx} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 font-mono text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-3 font-semibold text-white">
                          {hw.name}
                          {hw.isExtraLeg && (
                            <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                              Extra Leg
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-[11px]">{hw.notes || 'Standard Pacific OEM'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 sm:p-5 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
              <span className="text-xs text-gray-400">
                Pacific Products & Solutions â€¢ Bill of Materials
              </span>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-200 rounded-xl text-xs font-semibold border border-white/10 flex items-center gap-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print BOM Sheet</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ EDIT CATEGORY / BANNER MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {showCategoryModal && editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-[#121226] border border-white/10 rounded-3xl shadow-2xl overflow-hidden my-8">
            <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div>
                <span className="text-xs font-semibold text-[#7FB706]">Product Line Overview</span>
                <h3 className="text-xl font-bold text-white">Edit {editingCategory.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Product Title</label>
                <input
                  type="text"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Tagline</label>
                <input
                  type="text"
                  value={catTagline}
                  onChange={(e) => setCatTagline(e.target.value)}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Description</label>
                <textarea
                  rows={3}
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                />
              </div>

              {/* Cover Image Upload */}
              <div className="p-4 bg-black/40 border border-white/10 rounded-2xl space-y-3">
                <label className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-[#7FB706]" />
                  Product Line Banner Image
                </label>

                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden bg-[#0a0a1a] border border-white/10 shrink-0">
                    <img src={catImageUrl} alt="Category" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      type="file"
                      ref={catFileInputRef}
                      onChange={handleCategoryImageUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => catFileInputRef.current?.click()}
                      disabled={uploadingCatImage}
                      className="px-3.5 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-semibold border border-white/10 flex items-center gap-2 min-h-[40px] transition"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#7FB706]" />
                      <span>{uploadingCatImage ? 'Uploading...' : 'Upload Cover Image'}</span>
                    </button>
                    <input
                      type="text"
                      placeholder="Or enter direct image URL"
                      value={catImageUrl}
                      onChange={(e) => setCatImageUrl(e.target.value)}
                      className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6 border-t border-white/10 flex items-center justify-end gap-3 bg-white/[0.02]">
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCategory}
                className="px-5 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-black font-bold rounded-xl text-xs"
              >
                Save Product Info
              </button>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ DELETE CONFIRMATION MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {deleteConfirmModel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#121226] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-white">Delete Model?</h3>
              <p className="text-xs text-gray-300">
                Are you sure you want to delete <span className="text-white font-bold">"{deleteConfirmModel.title}"</span>?
              </p>
              <p className="text-xs text-rose-400 font-semibold mt-2">
                This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmModel(null)}
                className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-semibold min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteModel}
                className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/20 min-h-[44px]"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OpenAI Multi-Angle Gallery Studio Modal */}
      <OpenAIGalleryModal
        isOpen={showFormAiModal}
        onClose={() => setShowFormAiModal(false)}
        mainCoverUrl={formImageUrl}
        modelTitle={formTitle}
        category={formCategory}
        description={formDescription}
        onSuccess={(generatedUrls) => {
          setFormAdditionalImages((prev) => [...prev, ...generatedUrls]);
        }}
      />
    </div>
  );
}

