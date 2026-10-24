import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Upload,
  X,
  Package,
  Layers,
  Shield,
  Palette,
  Check,
  Sparkles,
  Info,
  CheckCircle2,
  Video,
  Film,
  Play,
  Plus,
  Trash2,
  Image as ImageIcon,
  Eye,
  Star,
  Link as LinkIcon,
  FileText,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Globe,
  FileCheck,
} from 'lucide-react';
import { uploadImage, uploadMultipleImages, uploadVideo, uploadFile, uploadBoqDocument, supabase } from '@/lib/supabase';
import { productCatalogApi } from '@/api/productCatalogApi';
import { DEFAULT_CUBICLE_DESCRIPTION } from '@/data/productCatalogData';
import OpenAIGalleryModal from '@/components/common/OpenAIGalleryModal';
import type {
  ProductCategoryType,
  ModelHardwareItem,
  ModelHardwareOption,
  SSHardwareColor,
  ProductModelColor,
  ProductCatalogModel,
} from '@/types/admin';

const SS_COLORS: SSHardwareColor[] = ['golden', 'Black', 'stainless steel'];

function toSlug(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function isValidUuid(id?: string): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

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

export default function EditProductModelPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [model, setModel] = useState<ProductCatalogModel | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Form State ──
  const [category, setCategory] = useState<ProductCategoryType>('Cubicle');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [additionalImages, setAdditionalImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingMultiple, setUploadingMultiple] = useState(false);
  const [imageError, setImageError] = useState('');
  const [showAiModal, setShowAiModal] = useState(false);
  const [autoAiGenerate, setAutoAiGenerate] = useState(false);
  const multiFileInputRef = useRef<HTMLInputElement>(null);

  // Video State: Minimum 2 videos
  const [videos, setVideos] = useState<string[]>(['', '']);
  const [uploadingVideoIdx, setUploadingVideoIdx] = useState<number | null>(null);
  const videoInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  // ── Specifications State ──
  const [stdHeight, setStdHeight] = useState('1980 mm / 2000 mm (including 150mm floor gap)');
  const [stdDepth, setStdDepth] = useState('1500 mm – 1800 mm');
  const [doorWidth, setDoorWidth] = useState('600 mm (Standard) / 900 mm (Accessible/ADA)');
  const [boardThickness, setBoardThickness] = useState('12mm / 18mm Solid Compact Phenolic Laminate');
  const [fireRating, setFireRating] = useState('Class 1 / BS 476 Part 7');
  const [waterResistance, setWaterResistance] = useState('100% Moisture, Water & Humidity Proof');

  // Hardware options
  const [ssEnabled, setSsEnabled] = useState(true);
  const [ssColors, setSsColors] = useState<SSHardwareColor[]>(['golden', 'Black', 'stainless steel']);
  const [nylonEnabled, setNylonEnabled] = useState(false);
  const [aluminiumEnabled, setAluminiumEnabled] = useState(false);
  const [tierCount, setTierCount] = useState<string | number>(1);
  const [hasExtraLeg, setHasExtraLeg] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);

  // Hardware list (NO quantity/unit)
  const [hardwareList, setHardwareList] = useState<ModelHardwareItem[]>([]);
  const [newHwName, setNewHwName] = useState('');

  // ── Colors & Finishes State ──
  const [modelColors, setModelColors] = useState<ProductModelColor[]>([]);
  const [uploadingColorIdx, setUploadingColorIdx] = useState<number | null>(null);
  const colorFileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const [newCustomColorName, setNewCustomColorName] = useState('');

  // ── "Why This Model" (Key Features) State ──
  const [features, setFeatures] = useState<string[]>([]);
  const [newFeatureText, setNewFeatureText] = useState('');

  // ── "Ideal Applications" State ──
  const [applications, setApplications] = useState<string[]>([]);
  const [newApplicationText, setNewApplicationText] = useState('');

  // ── Model Brochure State ──
  const [brochure, setBrochure] = useState<{
    id?: string;
    title: string;
    description?: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    documentType: string;
    category: string;
    published: boolean;
    productId?: string | null;
  } | null>(null);
  const [uploadingBrochure, setUploadingBrochure] = useState(false);
  const [brochureError, setBrochureError] = useState('');
  const brochureFileInputRef = useRef<HTMLInputElement>(null);

  // ── BOQ & SEO Metadata State ──
  const [boqUrl, setBoqUrl] = useState('');
  const [boqFileName, setBoqFileName] = useState('');
  const [boqFileSize, setBoqFileSize] = useState<number | undefined>(undefined);
  const [uploadingBoq, setUploadingBoq] = useState(false);
  const [boqError, setBoqError] = useState('');
  const boqFileInputRef = useRef<HTMLInputElement>(null);

  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');

  // Load Model
  useEffect(() => {
    async function fetchModel() {
      if (!id) return;
      setLoading(true);
      try {
        const found = await productCatalogApi.getModelById(id);
        if (found) {
          setModel(found);
          setCategory(found.category);
          setTitle(found.title);
          setSlug(found.slug);
          setSubtitle(found.subtitle);
          setImageUrl(found.imageUrl);
          setAdditionalImages(found.additionalImages || []);

          const rawVids = found.videos || found.videoUrls || [];
          if (rawVids.length >= 2) {
            setVideos(rawVids);
          } else if (rawVids.length === 1) {
            setVideos([rawVids[0], '']);
          } else {
            setVideos(['', '']);
          }

          setHardwareList(found.hardwareList ? [...found.hardwareList] : []);

          if (found.colors && Array.isArray(found.colors) && found.colors.length > 0) {
            setModelColors(found.colors);
          } else {
            const ssOpt = found.hardwareOptions?.find((o) => o.material === 'SS Hardware');
            const fallbackNames = ssOpt?.colors && ssOpt.colors.length > 0
              ? ssOpt.colors
              : ['Golden', 'Black', 'Stainless Steel'];
            setModelColors(fallbackNames.map((name) => ({ name, imageUrl: '' })));
          }

          if (found.features && Array.isArray(found.features) && found.features.length > 0) {
            setFeatures(found.features);
          } else {
            setFeatures([
              '10-Year Compact Board Warranty',
              '1-Year Hardware Replacement Warranty',
              '100% Water, Moisture & Termite Proof',
              'Heavy Duty Grade 304 Stainless Steel Hardware',
              'Class 1 Fire Retardant Core (BS 476 Part 7)',
              'Pan-India Supply & Turnkey Installation',
            ]);
          }

          if (found.applications && Array.isArray(found.applications) && found.applications.length > 0) {
            setApplications(found.applications);
          } else {
            setApplications([
              `Commercial ${found.category}`,
              'Corporate IT Parks & Offices',
              'Airports & High-Traffic Transit Hubs',
              'Shopping Malls & Retail Complexes',
              'Public Washrooms',
            ]);
          }

          const getSpec = (label: string, fallback: string) => {
            const spec = found.specifications?.find((s) => s.label.toLowerCase() === label.toLowerCase());
            return spec ? spec.value : fallback;
          };

          if (found.category === 'Cubicle' || found.category === 'Kids Toilet') {
            const isKids = found.category === 'Kids Toilet';
            setDescription(
              found.description ||
              (isKids
                ? 'Child-friendly ergonomic restroom cubicle partitions engineered with rounded safety corners, low-height doors, and anti-finger trap gaps. Ideal for kindergartens, primary schools, and play zones.'
                : DEFAULT_CUBICLE_DESCRIPTION)
            );
            setStdHeight(getSpec('Standard Height', isKids ? '1200 mm – 1500 mm (Child-Friendly Ergonomic Height)' : '1980 mm / 2000 mm (including 150mm floor gap)'));
            setStdDepth(getSpec('Standard Depth', isKids ? '1200 mm – 1500 mm' : '1500 mm – 1800 mm'));
            setDoorWidth(getSpec('Door Width', isKids ? '500 mm – 600 mm (Child Ergonomic Safety Door)' : '600 mm (Standard) / 900 mm (Accessible/ADA)'));
            setBoardThickness(getSpec('Board Thickness', isKids ? '12mm Solid Compact Phenolic Laminate' : '12mm / 18mm Solid Compact Phenolic Laminate'));
            setFireRating(getSpec('Fire Rating', 'Class 1 / BS 476 Part 7'));
            setWaterResistance(getSpec('Water Resistance', '100% Moisture, Water & Humidity Proof'));
          } else {
            setDescription(found.description);
          }

          const ssOpt = found.hardwareOptions?.find((o) => o.material === 'SS Hardware');
          const nylonOpt = found.hardwareOptions?.find((o) => o.material === 'Nylon Hardware');
          const alumOpt = found.hardwareOptions?.find((o) => o.material === 'Aluminium Profile');
          setSsEnabled(Boolean(ssOpt?.enabled));
          setSsColors(ssOpt?.colors || ['golden', 'Black', 'stainless steel']);
          setNylonEnabled(Boolean(nylonOpt?.enabled));
          setAluminiumEnabled(Boolean(alumOpt?.enabled));
          setTierCount(found.tierCount || 1);
          setHasExtraLeg(Boolean(found.hasExtraLeg));
          setIsFeatured(Boolean(found.isFeatured));
          setBoqUrl(found.boqUrl || '');
          setBoqFileName(found.boqFileName || '');
          setBoqFileSize(found.boqFileSize);
          setMetaTitle(found.metaTitle || '');
          setMetaDescription(found.metaDescription || '');

          // Load existing brochure from catalogs table
          try {
            let pId = isValidUuid(found.id) ? found.id : null;
            if (!pId) {
              const { data: pRow } = await supabase
                .from('products')
                .select('id')
                .eq('slug', found.slug)
                .maybeSingle();
              if (pRow?.id) pId = pRow.id;
            }

            if (pId) {
              const { data: catRows } = await supabase
                .from('catalogs')
                .select('*')
                .eq('product_id', pId)
                .order('created_at', { ascending: false });

              if (catRows && catRows.length > 0) {
                const b = catRows[0];
                setBrochure({
                  id: b.id,
                  title: b.title,
                  description: b.description,
                  fileUrl: b.file_url,
                  fileType: b.file_type || 'pdf',
                  fileSize: Number(b.file_size || 0),
                  documentType: b.document_type || 'Brochure',
                  category: b.category || found.category,
                  published: b.published !== false,
                  productId: b.product_id,
                });
              }
            }
          } catch (catErr) {
            console.warn('Error loading existing brochure for model:', catErr);
          }
        }
      } catch (err) {
        console.error('Failed to load model for editing:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchModel();
  }, [id]);

  const handleBrochureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isDoc = file.name.toLowerCase().endsWith('.doc') || file.name.toLowerCase().endsWith('.docx');
    if (!isPdf && !isDoc) {
      setBrochureError('Please upload a PDF document (.pdf) for the model brochure.');
      return;
    }

    setUploadingBrochure(true);
    setBrochureError('');

    try {
      const uploadRes = await uploadFile(file, 'catalogs');
      if (!uploadRes) {
        throw new Error('Failed to upload file to storage');
      }

      // Map model category to catalog category
      const catalogCategory = category === 'Cubicle'
        ? 'Restroom Cubicles'
        : category === 'Lockers'
        ? 'Locker Solution'
        : category === 'Urinal Partitions'
        ? 'Toilet Partition'
        : 'Restroom Cubicles';

      // Resolve product UUID
      let targetProductId: string | null = null;
      if (model && isValidUuid(model.id)) {
        targetProductId = model.id;
      } else {
        const finalSlug = slug.trim() ? toSlug(slug) : `${toSlug(category)}-${toSlug(title)}`;
        const { data: dbProd } = await supabase
          .from('products')
          .select('id')
          .eq('slug', finalSlug)
          .maybeSingle();
        if (dbProd?.id) targetProductId = dbProd.id;
      }

      const brochurePayload = {
        title: `${title.trim() || 'Model'} Brochure & Specifications`,
        description: `Official technical specifications, architectural drawings, and hardware catalog for ${title.trim() || 'this model'}.`,
        document_type: 'Brochure',
        category: catalogCategory,
        file_url: uploadRes.url,
        file_type: isPdf ? 'pdf' : 'document',
        file_size: uploadRes.size,
        thumbnail_url: imageUrl || '',
        product_id: targetProductId || null,
        published: true,
        sort_order: 1,
      };

      if (brochure?.id) {
        const { error: updErr } = await supabase
          .from('catalogs')
          .update(brochurePayload as any)
          .eq('id', brochure.id);
        if (updErr) throw updErr;

        setBrochure({
          id: brochure.id,
          title: brochurePayload.title,
          description: brochurePayload.description,
          fileUrl: uploadRes.url,
          fileType: isPdf ? 'pdf' : 'document',
          fileSize: uploadRes.size,
          documentType: 'Brochure',
          category: catalogCategory,
          published: true,
          productId: targetProductId,
        });
      } else {
        const { data: insData, error: insErr } = await supabase
          .from('catalogs')
          .insert([brochurePayload] as any)
          .select();
        if (insErr) throw insErr;

        setBrochure({
          id: insData?.[0]?.id,
          title: brochurePayload.title,
          description: brochurePayload.description,
          fileUrl: uploadRes.url,
          fileType: isPdf ? 'pdf' : 'document',
          fileSize: uploadRes.size,
          documentType: 'Brochure',
          category: catalogCategory,
          published: true,
          productId: targetProductId,
        });
      }

      alert('Model brochure uploaded successfully! It is now live on the Product page and Downloads hub.');
    } catch (err: any) {
      console.error('Error uploading brochure:', err);
      setBrochureError(err.message || 'Failed to upload brochure');
    } finally {
      setUploadingBrochure(false);
      if (brochureFileInputRef.current) brochureFileInputRef.current.value = '';
    }
  };

  const handleRemoveBrochure = async () => {
    if (!brochure?.id) {
      setBrochure(null);
      return;
    }
    if (!confirm('Are you sure you want to delete this brochure from the catalog?')) return;

    try {
      const { error: delErr } = await supabase.from('catalogs').delete().eq('id', brochure.id);
      if (delErr) throw delErr;
      setBrochure(null);
      alert('Brochure deleted successfully.');
    } catch (err: any) {
      alert('Failed to delete brochure: ' + err.message);
    }
  };

  // ── BOQ & SEO Handlers ──
  const handleBoqUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBoq(true);
    setBoqError('');

    try {
      const res = await uploadBoqDocument(file);
      if (!res || !res.url) {
        throw new Error('Failed to upload BOQ document to storage');
      }
      setBoqUrl(res.url);
      setBoqFileName(res.fileName);
      setBoqFileSize(res.size);
    } catch (err: any) {
      console.error('BOQ upload error:', err);
      setBoqError(err.message || 'Failed to upload BOQ document');
    } finally {
      setUploadingBoq(false);
      if (boqFileInputRef.current) boqFileInputRef.current.value = '';
    }
  };

  const handleRemoveBoq = () => {
    if (window.confirm('Remove attached BOQ document?')) {
      setBoqUrl('');
      setBoqFileName('');
      setBoqFileSize(undefined);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getBoqFileType = (name: string, url: string) => {
    const clean = (name || url).toLowerCase();
    if (clean.endsWith('.pdf')) return { label: 'PDF', bg: 'bg-red-500/10 text-red-400 border-red-500/20' };
    if (clean.endsWith('.xlsx') || clean.endsWith('.xls') || clean.endsWith('.csv')) {
      return { label: 'EXCEL', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
    }
    if (clean.endsWith('.docx') || clean.endsWith('.doc')) {
      return { label: 'WORD', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
    }
    return { label: 'DOC', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
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
      if (url) {
        setImageUrl(url);
        if (autoAiGenerate) {
          setShowAiModal(true);
        }
      }
    } catch (err: any) {
      setImageError(err.message || 'Image preview applied');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleMultipleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingMultiple(true);
    setImageError('');
    try {
      const urls = await uploadMultipleImages(Array.from(files), 'products');
      if (urls.length > 0) {
        setAdditionalImages((prev) => [...prev, ...urls]);
        if (!imageUrl) {
          setImageUrl(urls[0]);
        }
      }
    } catch (err: any) {
      console.warn('Batch images upload warning:', err);
      setImageError(err.message || 'Error uploading multiple images');
    } finally {
      setUploadingMultiple(false);
      if (multiFileInputRef.current) multiFileInputRef.current.value = '';
    }
  };

  const handleAddDirectImageUrl = () => {
    if (!newImageUrl.trim()) return;
    const url = newImageUrl.trim();
    if (!imageUrl) {
      setImageUrl(url);
    } else {
      setAdditionalImages((prev) => [...prev, url]);
    }
    setNewImageUrl('');
  };

  const handleSetMainImage = (img: string) => {
    if (img === imageUrl) return;
    const oldMain = imageUrl;
    setImageUrl(img);
    setAdditionalImages((prev) => [oldMain, ...prev.filter((item) => item !== img)]);
  };

  const handleRemoveImage = (img: string) => {
    if (img === imageUrl) {
      if (additionalImages.length > 0) {
        setImageUrl(additionalImages[0]);
        setAdditionalImages((prev) => prev.slice(1));
      } else {
        setImageUrl('');
      }
    } else {
      setAdditionalImages((prev) => prev.filter((item) => item !== img));
    }
  };

  const handleVideoChange = (idx: number, val: string) => {
    setVideos((prev) => {
      const copy = [...prev];
      copy[idx] = val;
      return copy;
    });
  };

  const handleAddVideoSlot = () => {
    setVideos((prev) => [...prev, '']);
  };

  const handleRemoveVideoSlot = (idx: number) => {
    if (videos.length <= 2) {
      // Keep minimum 2 slots, just clear the content
      setVideos((prev) => {
        const copy = [...prev];
        copy[idx] = '';
        return copy;
      });
      return;
    }
    setVideos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDirectVideoUpload = async (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingVideoIdx(idx);
    try {
      const url = await uploadVideo(file, 'videos');
      if (url) {
        handleVideoChange(idx, url);
      }
    } catch (err: any) {
      console.warn('Video upload notice:', err);
      alert(err.message || 'Failed to upload video');
    } finally {
      setUploadingVideoIdx(null);
      if (videoInputRefs.current[idx]) {
        videoInputRefs.current[idx]!.value = '';
      }
    }
  };

  const handleAddHwItem = () => {
    if (!newHwName.trim()) return;
    setHardwareList((prev) => [
      ...prev,
      {
        id: `hw-${Date.now()}`,
        name: newHwName.trim(),
        material: (category === 'Cubicle' || category === 'Kids Toilet') ? 'Both' : 'Standard',
      },
    ]);
    setNewHwName('');
  };

  const handleColorPhotoUpload = async (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingColorIdx(idx);
    try {
      const url = await uploadImage(file, 'products');
      if (url) {
        setModelColors((prev) => {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], imageUrl: url };
          return updated;
        });
      }
    } catch (err: any) {
      console.error('Failed to upload color photo:', err);
      alert(err.message || 'Failed to upload color photo');
    } finally {
      setUploadingColorIdx(null);
      if (colorFileInputRefs.current[idx]) {
        colorFileInputRefs.current[idx]!.value = '';
      }
    }
  };

  const handleUpdateColorName = (idx: number, name: string) => {
    setModelColors((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], name };
      return updated;
    });
  };

  const handleUpdateColorUrl = (idx: number, imageUrl: string) => {
    setModelColors((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], imageUrl };
      return updated;
    });
  };

  const handleRemoveColor = (idx: number) => {
    setModelColors((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddColor = (name?: string) => {
    const colorName = (name || newCustomColorName).trim();
    if (!colorName) return;
    setModelColors((prev) => [...prev, { name: colorName, imageUrl: '' }]);
    setNewCustomColorName('');
  };

  // ── Features Handlers ("Why This Model") ──
  const handleAddFeature = (text?: string) => {
    const val = (text || newFeatureText).trim();
    if (!val) return;
    if (!features.includes(val)) {
      setFeatures((prev) => [...prev, val]);
    }
    setNewFeatureText('');
  };

  const handleUpdateFeature = (idx: number, text: string) => {
    setFeatures((prev) => {
      const copy = [...prev];
      copy[idx] = text;
      return copy;
    });
  };

  const handleRemoveFeature = (idx: number) => {
    setFeatures((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── Applications Handlers ("Ideal Applications") ──
  const handleAddApplication = (text?: string) => {
    const val = (text || newApplicationText).trim();
    if (!val) return;
    if (!applications.includes(val)) {
      setApplications((prev) => [...prev, val]);
    }
    setNewApplicationText('');
  };

  const handleUpdateApplication = (idx: number, text: string) => {
    setApplications((prev) => {
      const copy = [...prev];
      copy[idx] = text;
      return copy;
    });
  };

  const handleRemoveApplication = (idx: number) => {
    setApplications((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert('Please enter a model name');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalSlug = slug.trim() ? toSlug(slug) : `${toSlug(category)}-${toSlug(title)}`;

      const hardwareOptions: ModelHardwareOption[] = [];
      if (category === 'Cubicle' || category === 'Kids Toilet') {
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
        if (aluminiumEnabled) {
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

      const specifications =
        category === 'Cubicle' || category === 'Kids Toilet'
          ? [
              { label: 'Standard Height', value: stdHeight },
              { label: 'Standard Depth', value: stdDepth },
              { label: 'Door Width', value: doorWidth },
              { label: 'Board Thickness', value: boardThickness },
              { label: 'Fire Rating', value: fireRating },
              { label: 'Water Resistance', value: waterResistance },
              ...(category === 'Kids Toilet'
                ? [{ label: 'Safety Clearance', value: 'Anti-Finger Pinch Hinge Gap & Outside Emergency Coin Release' }]
                : []),
            ]
          : model?.specifications || [
              { label: 'Category', value: category },
              { label: 'Board Thickness', value: '12mm / 18mm Compact Board' },
            ];

      const cleanColors = modelColors
        .map((c) => ({ name: c.name.trim(), imageUrl: c.imageUrl.trim() }))
        .filter((c) => c.name !== '');

      const cleanFeatures = features.map((f) => f.trim()).filter(Boolean);
      const cleanApplications = applications.map((a) => a.trim()).filter(Boolean);

      const updatedModel: ProductCatalogModel = {
        id: model ? model.id : `model-${toSlug(category)}-${toSlug(title)}-${Date.now()}`,
        slug: finalSlug,
        title: title.trim(),
        category,
        subtitle: subtitle.trim() || `${category} Model`,
        description: description.trim() || (category === 'Cubicle' ? DEFAULT_CUBICLE_DESCRIPTION : `${title} model by Pacific Restroom Cubicles.`),
        imageUrl: imageUrl,
        additionalImages: additionalImages.filter(Boolean),
        videos: videos.map((v) => (typeof v === 'string' ? v.trim() : '')).filter(Boolean),
        videoUrls: videos.map((v) => (typeof v === 'string' ? v.trim() : '')).filter(Boolean),
        colors: cleanColors,
        hardwareOptions,
        hardwareList,
        specifications,
        features: cleanFeatures.length > 0 ? cleanFeatures : [
          '10-Year Compact Board Warranty',
          '1-Year Hardware Replacement Warranty',
          '100% Water, Moisture & Termite Proof',
          'Heavy Duty Grade 304 Stainless Steel Hardware',
          'Pan-India Supply & Turnkey Installation',
        ],
        applications: cleanApplications.length > 0 ? cleanApplications : [
          `Commercial ${category}`,
          'Corporate IT Parks & Offices',
          'Public Washrooms',
        ],
        hasExtraLeg: category === 'Urinal Partitions' ? hasExtraLeg : false,
        tierCount: category === 'Lockers' ? tierCount : undefined,
        sortOrder: model?.sortOrder ?? 1,
        published: model?.published ?? true,
        isFeatured: isFeatured,
        boqUrl: boqUrl.trim() || undefined,
        boqFileName: boqFileName.trim() || undefined,
        boqFileSize: boqFileSize || undefined,
        metaTitle: metaTitle.trim() || undefined,
        metaDescription: metaDescription.trim() || undefined,
      };

      const saved = await productCatalogApi.saveModel(updatedModel);
      if (brochure?.id) {
        const prodId = isValidUuid(saved.id) ? saved.id : (isValidUuid(updatedModel.id) ? updatedModel.id : null);
        if (prodId) {
          try {
            await supabase.from('catalogs').update({ product_id: prodId } as any).eq('id', brochure.id);
          } catch {}
        }
      }
      alert(`Model "${title}" updated successfully!`);
      navigate(`/admin/dashboard/products/${saved.id || updatedModel.id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to update model');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#121226] border border-white/5 rounded-3xl p-16 text-center text-gray-400 max-w-5xl mx-auto my-12">
        <div className="animate-spin w-8 h-8 border-2 border-[#7FB706] border-t-transparent rounded-full mx-auto mb-3" />
        Loading model editor...
      </div>
    );
  }

  if (!model) {
    return (
      <div className="bg-[#121226] border border-white/5 rounded-3xl p-12 text-center text-gray-400 max-w-3xl mx-auto my-12 space-y-4">
        <Package className="w-10 h-10 mx-auto text-gray-500" />
        <h2 className="text-xl font-bold text-white">Model Not Found</h2>
        <p className="text-xs text-gray-400">The model to edit could not be found.</p>
        <Link
          to="/admin/dashboard/products"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#7FB706] text-black font-bold rounded-xl text-xs"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Products Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#121226] border border-white/5 p-4 sm:p-6 rounded-3xl">
        <div className="flex items-center gap-3">
          <Link
            to={`/admin/dashboard/products/${model.id}`}
            className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition border border-white/5 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <span className="text-xs font-semibold text-[#7FB706] tracking-wider uppercase flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" />
              Full Page Editor • {model.category}
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-white mt-0.5">
              Edit Model: <span className="capitalize text-[#7FB706]">{model.title}</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/admin/dashboard/products/${model.id}`}
            className="px-4 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white text-xs font-semibold text-center min-h-[44px] flex items-center justify-center"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-black font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#7FB706]/20 transition min-h-[44px] disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? 'Saving Changes...' : 'Save & Update'}</span>
          </button>
        </div>
      </div>

      {/* Main Form Fields */}
      <div className="space-y-6">
        {/* 1. Category Indicator */}
        <div className="p-5 sm:p-6 bg-[#121226] border border-white/5 rounded-3xl space-y-4">
          <label className="block text-xs font-bold text-gray-200 uppercase tracking-wider">
            1. Product Line
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(['Cubicle', 'Lockers', 'Urinal Partitions', 'Kids Toilet'] as ProductCategoryType[]).map((cat) => {
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
                    } else if (cat === 'Kids Toilet') {
                      setDescription('Child-friendly ergonomic restroom cubicle partitions engineered with rounded safety corners, low-height doors, and anti-finger trap gaps. Ideal for kindergartens, primary schools, and play zones.');
                      setStdHeight('1200 mm – 1500 mm (Child-Friendly Ergonomic Height)');
                      setStdDepth('1200 mm – 1500 mm');
                      setDoorWidth('500 mm – 600 mm (Child Ergonomic Safety Door)');
                      setBoardThickness('12mm Solid Compact Phenolic Laminate');
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
                        ? 'SS / Nylon / Aluminium'
                        : cat === 'Lockers'
                        ? 'Uniform H/W'
                        : cat === 'Urinal Partitions'
                        ? 'Extra Leg'
                        : 'Safety Design'}
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
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Subtitle / Tagline
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
              />
            </div>

            {/* Featured Model Toggle */}
            <div className="sm:col-span-2 p-4 bg-[#0a0a1a] border border-white/5 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl border transition ${
                    isFeatured
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-white/5 text-gray-400 border-white/5'
                  }`}
                >
                  <Star className={`w-5 h-5 ${isFeatured ? 'fill-amber-300 text-amber-300' : ''}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Featured Architectural Model</span>
                    {isFeatured && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Featured on Homepage
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Display this model prominently in the storefront homepage "Featured Architectural Models" showcase and priority catalog slots.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 self-end sm:self-center">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7FB706]" />
              </label>
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

          {(category === 'Cubicle' || category === 'Kids Toilet') && (
            <div className="pt-3 border-t border-white/5 space-y-3">
              <div className="text-xs font-bold text-[#7FB706] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                {category === 'Kids Toilet' ? 'Kids Safety Ergonomic Specifications' : 'Standard Cubicle Specifications'}
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

        {/* 4. Model Photos & Gallery */}
        <div className="p-5 sm:p-6 bg-[#121226] border border-white/5 rounded-3xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <label className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#7FB706]" />
                4. Model Photos & Multi-Photo Gallery <span className="text-rose-400">*</span>
              </label>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Upload multiple high-resolution photos for the interactive frontend gallery. The first photo serves as the primary cover.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300 hover:text-white select-none">
                <input
                  type="checkbox"
                  checked={autoAiGenerate}
                  onChange={(e) => setAutoAiGenerate(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-[#7FB706] focus:ring-[#7FB706] bg-[#0a0a1a] border-white/20"
                />
                <span className="text-[11px]">Auto-generate 4 angles on upload</span>
              </label>
              <span className="text-[11px] text-gray-400 font-mono">
                {1 + additionalImages.length} photo{1 + additionalImages.length > 1 ? 's' : ''} total
              </span>
            </div>
          </div>

          {/* Action Row: Batch Upload + Direct URL + AI Auto-Generate */}
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="file"
              ref={multiFileInputRef}
              onChange={handleMultipleImagesUpload}
              accept="image/*"
              multiple
              className="hidden"
            />
            <button
              type="button"
              onClick={() => multiFileInputRef.current?.click()}
              disabled={uploadingMultiple}
              className="px-4 py-2.5 bg-[#7FB706]/15 hover:bg-[#7FB706]/25 text-[#B5F823] border border-[#7FB706]/30 rounded-xl text-xs font-semibold flex items-center gap-2 min-h-[44px] transition disabled:opacity-50"
            >
              <Upload className="w-4 h-4 text-[#7FB706]" />
              <span>{uploadingMultiple ? 'Uploading Photos...' : 'Upload Multiple Photos (Batch)'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (!imageUrl) {
                  alert('Please select or upload a Main Cover photo first.');
                  return;
                }
                setShowAiModal(true);
              }}
              className="px-4 py-2.5 bg-gradient-to-r from-[#7FB706]/20 to-[#B5F823]/20 hover:from-[#7FB706]/30 hover:to-[#B5F823]/30 text-[#B5F823] border border-[#7FB706]/50 rounded-xl text-xs font-bold flex items-center gap-2 min-h-[44px] transition shadow-lg shadow-[#7FB706]/10"
            >
              <Sparkles className="w-4 h-4 text-[#B5F823]" />
              <span>Auto-Generate 4 Angles (AI)</span>
            </button>

            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <input
                type="text"
                placeholder="Or paste direct image URL (https://...)"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddDirectImageUrl();
                  }
                }}
                className="flex-1 bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
              />
              <button
                type="button"
                onClick={handleAddDirectImageUrl}
                disabled={!newImageUrl.trim()}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold border border-white/10 transition disabled:opacity-40 min-h-[38px]"
              >
                Add URL
              </button>
            </div>
          </div>

          {imageError && <div className="text-[11px] text-amber-400">{imageError}</div>}

          {/* Visual Gallery Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-2">
            {/* Primary Main Photo */}
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-[#0a0a1a] border-2 border-[#7FB706] shadow-lg group">
              <img src={imageUrl} alt="Main Cover" className="w-full h-full object-cover" />
              <div className="absolute top-2 left-2 bg-[#7FB706] text-black text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 shadow">
                <Star className="w-3 h-3 fill-black" /> Main Cover
              </div>
              <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => setShowAiModal(true)}
                  className="px-2 py-1 bg-black/90 hover:bg-[#7FB706] text-[#B5F823] hover:text-black rounded-lg text-[10px] font-bold transition flex items-center gap-1 border border-[#7FB706]/40"
                  title="Generate 4 Angles from this cover"
                >
                  <Sparkles className="w-3 h-3" /> AI 4 Angles
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveImage(imageUrl)}
                  className="p-1.5 bg-black/80 hover:bg-rose-600 text-white rounded-lg text-xs transition"
                  title="Remove Main Photo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Additional Photos */}
            {additionalImages.map((img, i) => (
              <div key={i} className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-[#0a0a1a] border border-white/10 group hover:border-[#7FB706]/50 transition">
                <img src={img} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-2">
                  <button
                    type="button"
                    onClick={() => handleSetMainImage(img)}
                    className="px-2 py-1 bg-[#7FB706] hover:bg-[#6fa005] text-black text-[10px] font-bold rounded-lg transition"
                    title="Set as Main Cover"
                  >
                    Set Main
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(img)}
                    className="p-1 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg transition"
                    title="Delete Photo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Demonstration & Walkthrough Videos (Minimum 2 Videos) */}
        <div className="p-5 sm:p-6 bg-[#121226] border border-white/5 rounded-3xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <label className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
                <Video className="w-4 h-4 text-[#7FB706]" />
                5. Demonstration & Walkthrough Videos (Minimum 2 Videos) <span className="text-rose-400">*</span>
              </label>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Link minimum two video presentations for this model (e.g. 360° architectural walkthrough and hardware installation guide). Supports direct video files (.mp4/.webm) or YouTube/Vimeo embed URLs.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddVideoSlot}
              className="inline-flex items-center gap-1.5 text-xs text-[#B5F823] hover:text-white bg-[#7FB706]/15 hover:bg-[#7FB706]/30 px-3 py-1.5 rounded-xl border border-[#7FB706]/30 transition self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Another Video Slot</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {videos.map((vidUrl, idx) => {
              const defaultSlotTitle =
                idx === 0
                  ? 'Video #1: Architectural Walkthrough / 360° Tour'
                  : idx === 1
                  ? 'Video #2: Hardware & Step-by-Step Installation'
                  : `Video #${idx + 1}: Additional Showcase`;
              const parsed = parseVideoSource(vidUrl);

              return (
                <div
                  key={idx}
                  className="bg-[#0a0a1a] border border-white/10 rounded-2xl p-4 space-y-3 flex flex-col justify-between hover:border-[#7FB706]/30 transition"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Film className="w-3.5 h-3.5 text-[#7FB706]" />
                        {defaultSlotTitle}
                      </span>
                      {videos.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveVideoSlot(idx)}
                          className="p-1 text-gray-400 hover:text-rose-400 transition"
                          title="Remove video slot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Inputs: URL or Direct Upload */}
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="YouTube, Vimeo, or MP4 URL (https://...)"
                        value={vidUrl}
                        onChange={(e) => handleVideoChange(idx, e.target.value)}
                        className="w-full bg-[#121226] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
                      />

                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          ref={(el) => (videoInputRefs.current[idx] = el)}
                          onChange={(e) => handleDirectVideoUpload(idx, e)}
                          accept="video/mp4,video/webm,video/quicktime"
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => videoInputRefs.current[idx]?.click()}
                          disabled={uploadingVideoIdx === idx}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-[11px] font-medium border border-white/10 flex items-center gap-1.5 transition disabled:opacity-50"
                        >
                          <Upload className="w-3 h-3 text-[#7FB706]" />
                          <span>{uploadingVideoIdx === idx ? 'Uploading Video...' : 'Upload Video File (.mp4)'}</span>
                        </button>
                        {vidUrl && (
                          <button
                            type="button"
                            onClick={() => handleVideoChange(idx, '')}
                            className="text-[11px] text-rose-400 hover:underline"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Live Video Player Preview */}
                  <div className="relative rounded-xl overflow-hidden aspect-video bg-black/60 border border-white/10 flex items-center justify-center">
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
                      <div className="text-center p-4 text-gray-500 space-y-1">
                        <Play className="w-6 h-6 mx-auto opacity-40 text-gray-400" />
                        <div className="text-[11px]">No video provided yet</div>
                        <div className="text-[10px] text-gray-600">Enter a URL or upload a file above</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 6. Hardware Configuration Area */}
        <div className="p-5 sm:p-6 bg-[#121226] border border-white/5 rounded-3xl space-y-4">
          <label className="block text-xs font-bold text-gray-200 uppercase tracking-wider">
            6. Hardware Options Configuration
          </label>

          {/* Cubicle & Kids Toilet rules */}
          {(category === 'Cubicle' || category === 'Kids Toilet') && (
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
                <span className="text-[11px] text-gray-400">Chemical &amp; Rust Proof</span>
              </div>

              {/* Aluminium Profile Toggle */}
              <div className="p-3.5 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white">
                  <input
                    type="checkbox"
                    checked={aluminiumEnabled}
                    onChange={(e) => setAluminiumEnabled(e.target.checked)}
                    className="w-4 h-4 accent-[#7FB706] rounded cursor-pointer"
                  />
                  <span>Aluminium Profile Hardware (Extruded &amp; Anodized)</span>
                </label>
                <span className="text-[11px] text-gray-400">Structural Profiles</span>
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

        {/* 7. Colors & Finishes Configuration Area */}
        <div className="p-5 sm:p-6 bg-[#121226] border border-white/5 rounded-3xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/10 pb-3">
            <div>
              <label className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
                <Palette className="w-4 h-4 text-[#7FB706]" />
                7. Colors & Finishes — Photos for Storefront Showcase ({modelColors.length})
              </label>
              <p className="text-xs text-gray-400 mt-0.5">
                Upload finish photos and textures for each color. Customers can click through these finishes interactively on the product page.
              </p>
            </div>
            <span className="text-xs font-mono text-[#7FB706] bg-[#7FB706]/10 px-2.5 py-1 rounded-xl border border-[#7FB706]/20 font-bold self-start sm:self-auto">
              {modelColors.filter((c) => c.imageUrl.trim() !== '').length} / {modelColors.length} Photos Set
            </span>
          </div>

          {/* Quick presets if empty or missing */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] text-gray-400 font-medium">Quick Add Presets:</span>
            {['Golden', 'Black', 'Stainless Steel', 'Woodgrain Walnut', 'Slate Gray'].map((preset) => {
              const alreadyExists = modelColors.some((c) => c.name.toLowerCase() === preset.toLowerCase());
              if (alreadyExists) return null;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleAddColor(preset)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-[11px] flex items-center gap-1 transition"
                >
                  <Plus className="w-3 h-3 text-[#7FB706]" />
                  <span>{preset}</span>
                </button>
              );
            })}
          </div>

          {/* Color Finish Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {modelColors.map((color, idx) => {
              const hasImage = Boolean(color.imageUrl && color.imageUrl.trim());
              const isUploading = uploadingColorIdx === idx;

              return (
                <div
                  key={idx}
                  className="bg-[#0a0a1a] border border-white/10 rounded-2xl p-3.5 space-y-3 flex flex-col justify-between hover:border-white/20 transition"
                >
                  <div className="space-y-2.5">
                    {/* Header: Name input + Remove Finish button */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={color.name}
                        onChange={(e) => handleUpdateColorName(idx, e.target.value)}
                        placeholder="Finish Name (e.g. Golden, Black)"
                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-[#7FB706]"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveColor(idx)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        title="Delete Finish"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Image Preview / Upload Area */}
                    <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-black/60 border border-white/10 group">
                      {hasImage ? (
                        <>
                          <img
                            src={color.imageUrl}
                            alt={color.name}
                            className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2.5">
                            <div className="flex items-center justify-between">
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/80 text-white font-bold backdrop-blur-sm flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Photo Active
                              </span>
                              <div className="flex items-center gap-1.5">
                                <a
                                  href={color.imageUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 rounded-lg bg-black/70 hover:bg-black text-gray-300 hover:text-white transition"
                                  title="View Full Size"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateColorUrl(idx, '')}
                                  className="p-1.5 rounded-lg bg-black/70 hover:bg-rose-600 text-gray-300 hover:text-white transition"
                                  title="Remove Photo"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => colorFileInputRefs.current[idx]?.click()}
                              disabled={isUploading}
                              className="w-full py-1.5 bg-[#7FB706] hover:bg-[#6fa005] text-black font-bold text-[11px] rounded-lg flex items-center justify-center gap-1.5 shadow transition"
                            >
                              <Upload className="w-3 h-3" />
                              <span>{isUploading ? 'Uploading...' : 'Replace Photo'}</span>
                            </button>
                          </div>
                        </>
                      ) : (
                        <div
                          onClick={() => !isUploading && colorFileInputRefs.current[idx]?.click()}
                          className={`w-full h-full flex flex-col items-center justify-center p-3 text-center cursor-pointer transition ${
                            isUploading ? 'opacity-50 cursor-wait' : 'hover:bg-white/[0.03]'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-1.5 text-gray-400 group-hover:text-[#7FB706] group-hover:border-[#7FB706]/40 transition">
                            <Upload className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-semibold text-gray-200 group-hover:text-white">
                            {isUploading ? 'Uploading to ImageKit...' : 'Upload Color Photo'}
                          </span>
                          <span className="text-[10px] text-gray-500 mt-0.5">PNG, JPG, WebP (16:9 / 4:3)</span>
                        </div>
                      )}
                    </div>

                    {/* Direct Image URL input */}
                    <div className="flex items-center gap-1.5">
                      <div className="relative flex-1">
                        <LinkIcon className="w-3 h-3 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={color.imageUrl}
                          onChange={(e) => handleUpdateColorUrl(idx, e.target.value)}
                          placeholder="Or paste image URL"
                          className="w-full bg-black/40 border border-white/10 rounded-lg pl-7 pr-2.5 py-1 text-[11px] text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-[#7FB706]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Hidden file input */}
                  <input
                    ref={(el) => (colorFileInputRefs.current[idx] = el)}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleColorPhotoUpload(idx, e)}
                  />
                </div>
              );
            })}
          </div>

          {/* Add Custom Color Finish bar */}
          <div className="p-3 bg-white/[0.02] border border-white/10 rounded-2xl flex flex-wrap gap-2 items-center">
            <input
              type="text"
              placeholder="Add another color / finish name (e.g. Copper Bronze, Royal Blue, Teak Wood)"
              value={newCustomColorName}
              onChange={(e) => setNewCustomColorName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddColor();
                }
              }}
              className="flex-1 min-w-[220px] bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7FB706]"
            />
            <button
              type="button"
              onClick={() => handleAddColor()}
              className="px-4 py-2 bg-[#7FB706]/20 hover:bg-[#7FB706]/30 text-[#7FB706] rounded-xl text-xs font-bold transition flex items-center gap-1.5 min-h-[38px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Color Finish</span>
            </button>
          </div>
        </div>

        {/* 8. "Why This Model" (Key Features) Configuration Area */}
        <div className="p-5 sm:p-6 bg-[#121226] border border-white/5 rounded-3xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/10 pb-3">
            <div>
              <label className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#7FB706]" />
                8. "Why This Model" — Key Features & Selling Points ({features.length})
              </label>
              <p className="text-xs text-gray-400 mt-0.5">
                Bullet points displayed under the "Why This Model" section on the website product detail page.
              </p>
            </div>
            <span className="text-xs font-mono text-[#7FB706] bg-[#7FB706]/10 px-2.5 py-1 rounded-xl border border-[#7FB706]/20 font-bold self-start sm:self-auto">
              {features.length} Features
            </span>
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] text-gray-400 font-medium">Quick Add Presets:</span>
            {[
              '10-Year Compact Board Warranty',
              '1-Year Hardware Replacement Warranty',
              '100% Water & Moisture Proof',
              'Grade 304 Stainless Steel Hardware',
              'Polyamide Rust-Proof Nylon Hardware',
              'Anodized Aluminium Profile Hardware',
              'Class 1 Fire Retardant Core',
              'Anti-Vandal High Impact Resistance',
              'ADA / Barrier-Free Accessible Design',
              'Pan-India Supply & Turnkey Installation',
            ].map((preset) => {
              const alreadyExists = features.some((f) => f.toLowerCase() === preset.toLowerCase());
              if (alreadyExists) return null;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleAddFeature(preset)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-[11px] flex items-center gap-1 transition"
                >
                  <Plus className="w-3 h-3 text-[#7FB706]" />
                  <span>{preset}</span>
                </button>
              );
            })}
          </div>

          {/* Features List */}
          <div className="space-y-2 pt-2">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2.5 p-2 bg-[#0a0a1a] border border-white/10 rounded-xl hover:border-white/20 transition group"
              >
                <div className="w-6 h-6 rounded-lg bg-[#7FB706]/10 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#7FB706]" />
                </div>
                <input
                  type="text"
                  value={feature}
                  onChange={(e) => handleUpdateFeature(idx, e.target.value)}
                  className="flex-1 bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none focus:text-[#B5F823]"
                  placeholder="Feature point (e.g. 10-Year Compact Board Warranty)"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveFeature(idx)}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                  title="Remove Feature"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Add custom feature input bar */}
          <div className="p-3 bg-white/[0.02] border border-white/10 rounded-2xl flex flex-wrap gap-2 items-center">
            <input
              type="text"
              placeholder="Add another selling point (e.g. Heavy Duty Self-Closing Gravity Hinges)"
              value={newFeatureText}
              onChange={(e) => setNewFeatureText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddFeature();
                }
              }}
              className="flex-1 min-w-[240px] bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7FB706]"
            />
            <button
              type="button"
              onClick={() => handleAddFeature()}
              className="px-4 py-2 bg-[#7FB706]/20 hover:bg-[#7FB706]/30 text-[#7FB706] rounded-xl text-xs font-bold transition flex items-center gap-1.5 min-h-[38px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Feature</span>
            </button>
          </div>
        </div>

        {/* 9. "Ideal Applications" (Where It's Used) Configuration Area */}
        <div className="p-5 sm:p-6 bg-[#121226] border border-white/5 rounded-3xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/10 pb-3">
            <div>
              <label className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4 text-[#7FB706]" />
                9. "Ideal Applications" — Where It's Used ({applications.length})
              </label>
              <p className="text-xs text-gray-400 mt-0.5">
                Application environment badges displayed under "Ideal Applications" on the product detail page.
              </p>
            </div>
            <span className="text-xs font-mono text-[#7FB706] bg-[#7FB706]/10 px-2.5 py-1 rounded-xl border border-[#7FB706]/20 font-bold self-start sm:self-auto">
              {applications.length} Applications
            </span>
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] text-gray-400 font-medium">Quick Add Presets:</span>
            {[
              'Commercial Restroom Cubicles',
              'Corporate IT Parks & Offices',
              'Airports & High-Traffic Transit Hubs',
              'Shopping Malls & Retail Centers',
              'Luxury Hotels & Resorts',
              'Hospitals & Healthcare Facilities',
              'Schools & University Campuses',
              'Gyms, Spas & Sports Stadiums',
              'Cinemas, Clubs & Multiplexes',
              'Manufacturing & Industrial Plants',
            ].map((preset) => {
              const alreadyExists = applications.some((a) => a.toLowerCase() === preset.toLowerCase());
              if (alreadyExists) return null;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleAddApplication(preset)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-[11px] flex items-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{preset}</span>
                </button>
              );
            })}
          </div>

          {/* Application Badges / Chips list */}
          <div className="flex flex-wrap gap-2.5 pt-2">
            {applications.map((app, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#0a0a1a] border border-white/15 rounded-xl hover:border-[#7FB706]/50 transition group"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#7FB706]" />
                <input
                  type="text"
                  value={app}
                  onChange={(e) => handleUpdateApplication(idx, e.target.value)}
                  className="bg-transparent text-xs text-white font-medium focus:outline-none focus:text-[#B5F823] w-auto min-w-[80px]"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveApplication(idx)}
                  className="p-0.5 rounded text-gray-500 hover:text-rose-400 transition"
                  title="Remove Application"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Add custom application input bar */}
          <div className="p-3 bg-white/[0.02] border border-white/10 rounded-2xl flex flex-wrap gap-2 items-center">
            <input
              type="text"
              placeholder="Add another application (e.g. Metro Stations, Luxury Clubhouses)"
              value={newApplicationText}
              onChange={(e) => setNewApplicationText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddApplication();
                }
              }}
              className="flex-1 min-w-[240px] bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7FB706]"
            />
            <button
              type="button"
              onClick={() => handleAddApplication()}
              className="px-4 py-2 bg-[#7FB706]/20 hover:bg-[#7FB706]/30 text-[#7FB706] rounded-xl text-xs font-bold transition flex items-center gap-1.5 min-h-[38px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Application</span>
            </button>
          </div>
        </div>

        {/* 10. Hardware Bill of Materials (NO Quantity Option) */}
        <div className="p-5 sm:p-6 bg-[#121226] border border-white/5 rounded-3xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <label className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#7FB706]" />
                10. Hardware Bill of Materials ({hardwareList.length} items)
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

        {/* 11. Model Brochure & Technical Catalog (PDF) */}
        <div className="p-5 sm:p-6 bg-[#121226] border border-white/5 rounded-3xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div>
              <label className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#7FB706]" />
                11. Model Brochure &amp; Technical Catalog (PDF)
              </label>
              <p className="text-xs text-gray-400 mt-0.5">
                Upload the official architectural catalog, BOQ, or CAD spec PDF for this model. Visitors can download it directly from the product page and downloads directory.
              </p>
            </div>
            {brochure && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full text-xs font-semibold self-start sm:self-auto">
                <CheckCircle2 className="w-3.5 h-3.5" /> Published
              </span>
            )}
          </div>

          <input
            ref={brochureFileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleBrochureUpload}
            className="hidden"
          />

          {brochureError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
              {brochureError}
            </div>
          )}

          {brochure ? (
            <div className="bg-[#0a0a1a] border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6 text-red-400" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-white font-semibold text-sm truncate">{brochure.title}</h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {brochure.fileType.toUpperCase()} Document • {brochure.fileSize ? `${(brochure.fileSize / (1024 * 1024)).toFixed(2)} MB` : 'PDF'} • Categorized under "{brochure.category}"
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={brochure.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-200 hover:text-white rounded-xl text-xs font-medium border border-white/10 transition"
                  title="Preview document"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Preview
                </a>
                <a
                  href={brochure.fileUrl}
                  download
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#7FB706]/15 hover:bg-[#7FB706]/25 text-[#7FB706] rounded-xl text-xs font-semibold border border-[#7FB706]/30 transition"
                  title="Download document"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </a>
                <button
                  type="button"
                  onClick={() => brochureFileInputRef.current?.click()}
                  disabled={uploadingBrochure}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl text-xs font-medium border border-white/10 transition disabled:opacity-50"
                  title="Replace document"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {uploadingBrochure ? 'Uploading...' : 'Replace'}
                </button>
                <button
                  type="button"
                  onClick={handleRemoveBrochure}
                  className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition"
                  title="Delete brochure"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-white/10 rounded-2xl p-6 sm:p-8 text-center hover:border-[#7FB706]/40 transition group bg-white/[0.01]">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition">
                <FileText className="w-6 h-6 text-gray-400 group-hover:text-[#7FB706] transition" />
              </div>
              <h4 className="text-white text-sm font-semibold mb-1">No Brochure Uploaded For This Model</h4>
              <p className="text-xs text-gray-400 mb-4 max-w-md mx-auto">
                Upload the specification catalog or technical BOQ in PDF format. It will be immediately available for customers on the product page and central downloads portal.
              </p>
              <button
                type="button"
                onClick={() => brochureFileInputRef.current?.click()}
                disabled={uploadingBrochure}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-black font-bold rounded-xl text-xs shadow-lg shadow-[#7FB706]/20 transition active:scale-95 disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                {uploadingBrochure ? 'Uploading Brochure...' : 'Upload Model Brochure (PDF)'}
              </button>
            </div>
          )}
        </div>

        {/* 12. Bill of Quantities (BOQ) Document Upload */}
        <div className="p-5 sm:p-6 bg-[#121226] border border-white/5 rounded-3xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div>
              <label className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#7FB706]" />
                12. Bill of Quantities (BOQ) Document
              </label>
              <p className="text-xs text-gray-400 mt-0.5">
                Upload the itemized BOQ estimation spreadsheet (Excel / PDF / Word / CSV) containing cubicle dimensions, hardware counts, and commercial rate analysis.
              </p>
            </div>
            {boqUrl && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-semibold self-start sm:self-auto">
                <FileCheck className="w-3.5 h-3.5" /> BOQ Attached
              </span>
            )}
          </div>

          <input
            ref={boqFileInputRef}
            type="file"
            accept=".pdf,.xlsx,.xls,.doc,.docx,.csv"
            onChange={handleBoqUpload}
            className="hidden"
          />

          {boqError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
              {boqError}
            </div>
          )}

          {boqUrl ? (
            <div className="bg-[#0a0a1a] border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-[#7FB706]/10 border border-[#7FB706]/20 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-6 h-6 text-[#7FB706]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getBoqFileType(boqFileName, boqUrl).bg}`}>
                      {getBoqFileType(boqFileName, boqUrl).label}
                    </span>
                    <h4 className="text-white font-semibold text-sm truncate">{boqFileName || 'Product-BOQ-Document'}</h4>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 truncate">
                    {boqFileSize ? formatFileSize(boqFileSize) : 'Document'} • <span className="font-mono text-[11px] text-gray-500">{boqUrl}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={boqUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-200 hover:text-white rounded-xl text-xs font-medium border border-white/10 transition"
                  title="Preview BOQ Document"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Preview
                </a>
                <a
                  href={boqUrl}
                  download={boqFileName || 'Product-BOQ'}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#7FB706]/15 hover:bg-[#7FB706]/25 text-[#7FB706] rounded-xl text-xs font-semibold border border-[#7FB706]/30 transition"
                  title="Download BOQ"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </a>
                <button
                  type="button"
                  onClick={() => boqFileInputRef.current?.click()}
                  disabled={uploadingBoq}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl text-xs font-medium border border-white/10 transition disabled:opacity-50"
                  title="Replace BOQ"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {uploadingBoq ? 'Uploading...' : 'Replace'}
                </button>
                <button
                  type="button"
                  onClick={handleRemoveBoq}
                  className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition"
                  title="Remove BOQ"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-white/10 rounded-2xl p-6 sm:p-8 text-center hover:border-[#7FB706]/40 transition group bg-white/[0.01]">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition">
                <FileSpreadsheet className="w-6 h-6 text-gray-400 group-hover:text-[#7FB706] transition" />
              </div>
              <h4 className="text-white text-sm font-semibold mb-1">No BOQ Document Uploaded For This Model</h4>
              <p className="text-xs text-gray-400 mb-4 max-w-md mx-auto">
                Upload the Bill of Quantities spreadsheet (.xlsx, .xls, .csv) or technical specification sheet (.pdf, .docx) for contractor estimates and architect downloads.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => boqFileInputRef.current?.click()}
                  disabled={uploadingBoq}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-black font-bold rounded-xl text-xs shadow-lg shadow-[#7FB706]/20 transition active:scale-95 disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  {uploadingBoq ? 'Uploading BOQ...' : 'Upload BOQ Document (Excel/PDF)'}
                </button>
              </div>

              {/* Direct Link Option */}
              <div className="mt-4 pt-4 border-t border-white/5 max-w-md mx-auto">
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="Or enter hosted BOQ file URL (https://...)"
                    value={boqUrl}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBoqUrl(val);
                      if (val && !boqFileName) {
                        const guessedName = val.split('/').pop()?.split('?')[0] || 'boq-document.pdf';
                        setBoqFileName(guessedName);
                      }
                    }}
                    className="flex-1 bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7FB706]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 13. Search Engine Optimization (SEO) & Social Meta */}
        <div className="p-5 sm:p-6 bg-[#121226] border border-white/5 rounded-3xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div>
              <label className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#7FB706]" />
                13. Search Engine Optimization (SEO) &amp; Social Meta
              </label>
              <p className="text-xs text-gray-400 mt-0.5">
                Optimize search rank on Google and preview search results for architects and procurement officers.
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20 font-bold flex items-center gap-1.5 self-start sm:self-auto">
              <Sparkles className="w-3.5 h-3.5" /> Google SERP Optimized
            </span>
          </div>

          {/* Google SERP Snippet Preview */}
          <div className="rounded-2xl bg-[#080811] border border-white/10 p-4 space-y-1.5">
            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold block">
              Google Search Result Snippet Preview
            </span>
            <p className="text-sm text-[#8ab4f8] font-medium truncate">
              {metaTitle.trim() || (title ? `${title} | Commercial Restroom Cubicle | Pacific Restroom Systems` : 'Product Model Title | Pacific Restroom Systems')}
            </p>
            <p className="text-xs text-[#00a67e] truncate font-mono">
              https://www.pacificproduct.in/product/{slug ? toSlug(slug) : (title ? `${toSlug(category)}-${toSlug(title)}` : 'product-slug')}
            </p>
            <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
              {metaDescription.trim() || description.replace(/<[^>]*>/g, '').slice(0, 160) || 'Premium restroom cubicles and commercial toilet partition systems manufactured with solid compact phenolic laminate.'}
            </p>
          </div>

          <div className="space-y-4">
            {/* Meta Title */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-200 flex items-center gap-2">
                  Meta Title (Browser Tab &amp; Google Title)
                </label>
                <span
                  className={`text-[10px] font-mono ${
                    metaTitle.length >= 50 && metaTitle.length <= 60
                      ? 'text-emerald-400'
                      : metaTitle.length > 60
                      ? 'text-amber-400'
                      : 'text-gray-400'
                  }`}
                >
                  {metaTitle.length} / 60 chars (Recommended: 50–60)
                </span>
              </div>
              <input
                type="text"
                placeholder={title ? `${title} | Pacific Restroom Systems` : 'e.g. Designer Restroom Cubicles | Heavy Duty Compact Laminate | Pacific'}
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#7FB706]"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                If left blank, search engines will use the default title template.
              </p>
            </div>

            {/* Meta Description */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-200 flex items-center gap-2">
                  Meta Description (Search Results Summary)
                </label>
                <span
                  className={`text-[10px] font-mono ${
                    metaDescription.length >= 140 && metaDescription.length <= 160
                      ? 'text-emerald-400'
                      : metaDescription.length > 160
                      ? 'text-amber-400'
                      : 'text-gray-400'
                  }`}
                >
                  {metaDescription.length} / 160 chars (Recommended: 150–160)
                </span>
              </div>
              <textarea
                rows={3}
                placeholder={description.replace(/<[^>]*>/g, '').slice(0, 160) || 'e.g. Explore our commercial grade restroom cubicles with 10-year compact board warranty, grade 304 SS hardware, and turnkey installation across India.'}
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#7FB706] resize-none"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                A concise summary of the product benefits to maximize click-through rate from search engines.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-end gap-3">
          <Link
            to={`/admin/dashboard/products/${model.id}`}
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
            <span>{isSubmitting ? 'Saving Changes...' : 'Save & Update Model'}</span>
          </button>
        </div>
      </div>

      {/* OpenAI Multi-Angle Gallery Studio Modal */}
      <OpenAIGalleryModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        mainCoverUrl={imageUrl}
        modelTitle={title}
        category={category}
        description={description}
        onSuccess={(generatedUrls) => {
          setAdditionalImages((prev) => [...prev, ...generatedUrls]);
        }}
      />
    </div>
  );
}
