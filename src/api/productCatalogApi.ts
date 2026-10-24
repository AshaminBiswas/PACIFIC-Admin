import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type {
  ProductCatalogModel,
  TopProductCategory,
  ProductCategoryType,
} from '../types/admin';
import {
  DEFAULT_TOP_CATEGORIES,
} from '../data/productCatalogData';

const LOCAL_STORAGE_MODELS_KEY = 'pacific_product_catalog_models_v5';
const LOCAL_STORAGE_CATEGORIES_KEY = 'pacific_product_catalog_categories_v4';

// In-memory cache for ultra-fast instant UI rendering
let memoryModelsCache: ProductCatalogModel[] | null = null;
let lastModelsFetchTime = 0;
const MODELS_CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes cache TTL to slash Supabase egress

// Clear outdated legacy caches if present
try {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('pacific_product_catalog_models_v1');
    localStorage.removeItem('pacific_product_catalog_models_v2');
    localStorage.removeItem('pacific_product_catalog_models_v3');
    localStorage.removeItem('pacific_product_catalog_models_v4');
  }
} catch {}

// ── Helpers to map between DB row and ProductCatalogModel ─────────────

function isValidUuid(id?: string): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function mapDbRowToModel(row: any): ProductCatalogModel {
  const specs = Array.isArray(row.specifications) ? row.specifications : [];
  
  // Extra metadata packed into specifications JSON
  const hardwareMeta = specs.find((s: any) => s.label === '__hardware_meta');
  let hardwareOptions = hardwareMeta?.value?.hardwareOptions;
  let hardwareList = hardwareMeta?.value?.hardwareList;
  let hasExtraLeg = hardwareMeta?.value?.hasExtraLeg;
  let tierCount = hardwareMeta?.value?.tierCount;
  let videos = Array.isArray(row.videos) ? row.videos : (hardwareMeta?.value?.videos || []);

  // Default to empty array if hardware metadata not specified
  hardwareOptions = hardwareOptions || [];
  hardwareList = hardwareList || [];
  hasExtraLeg = Boolean(hasExtraLeg);
  tierCount = tierCount || '';

  const category = (row.category as ProductCategoryType) || 'Cubicle';

  // Filter out internal metadata keys from public specifications
  const cleanSpecs = specs.filter((s: any) => !s.label.startsWith('__'));

  // Ensure cleanSpecs includes essential technical specifications if empty or incomplete
  let finalSpecs = [...cleanSpecs];
  const hasHeight = finalSpecs.some((s: any) => s.label.toLowerCase().includes('height'));
  const hasDepth = finalSpecs.some((s: any) => s.label.toLowerCase().includes('depth') || s.label.toLowerCase().includes('size'));
  const hasDoor = finalSpecs.some((s: any) => s.label.toLowerCase().includes('door'));
  const hasThickness = finalSpecs.some((s: any) => s.label.toLowerCase().includes('thickness'));

  if (category === 'Kids Toilet') {
    if (!hasHeight) finalSpecs.push({ label: 'Standard Height', value: '1200 mm – 1500 mm (Child-Friendly Ergonomic Height)' });
    if (!hasDepth) finalSpecs.push({ label: 'Standard Depth', value: '1200 mm – 1500 mm' });
    if (!hasDoor) finalSpecs.push({ label: 'Door Width', value: '500 mm – 600 mm (Child Ergonomic Safety Door)' });
    if (!hasThickness) finalSpecs.push({ label: 'Board Thickness', value: '12mm Solid Compact Phenolic Laminate' });
    if (!finalSpecs.some((s: any) => s.label.toLowerCase().includes('fire'))) {
      finalSpecs.push({ label: 'Fire Rating', value: 'Class 1 / BS 476 Part 7' });
    }
    if (!finalSpecs.some((s: any) => s.label.toLowerCase().includes('water'))) {
      finalSpecs.push({ label: 'Water Resistance', value: '100% Moisture, Water & Humidity Proof' });
    }
    if (!finalSpecs.some((s: any) => s.label.toLowerCase().includes('safety'))) {
      finalSpecs.push({ label: 'Safety Feature', value: 'Anti-Pinch Hinge Gap & Outside Emergency Coin Release' });
    }
  } else if (category === 'Cubicle') {
    if (!hasHeight) finalSpecs.push({ label: 'Standard Height', value: '1980 mm / 2000 mm (including 150mm floor gap)' });
    if (!hasDepth) finalSpecs.push({ label: 'Standard Depth', value: '1500 mm – 1800 mm' });
    if (!hasDoor) finalSpecs.push({ label: 'Door Width', value: '600 mm (Standard) / 900 mm (Accessible/ADA)' });
    if (!hasThickness) finalSpecs.push({ label: 'Board Thickness', value: '12mm / 18mm Solid Compact Phenolic Laminate' });
    if (!finalSpecs.some((s: any) => s.label.toLowerCase().includes('fire'))) {
      finalSpecs.push({ label: 'Fire Rating', value: 'Class 1 / BS 476 Part 7' });
    }
    if (!finalSpecs.some((s: any) => s.label.toLowerCase().includes('water'))) {
      finalSpecs.push({ label: 'Water Resistance', value: '100% Moisture, Water & Humidity Proof' });
    }
  }

  // Ensure default hardware options & list for Kids Toilet if unpopulated
  if (category === 'Kids Toilet' && (!hardwareOptions || hardwareOptions.length === 0)) {
    hardwareOptions = [
      { material: 'SS Hardware', enabled: true, colors: ['golden', 'Black', 'stainless steel'] },
      { material: 'Nylon Hardware', enabled: true, colors: [] },
    ];
  }
  if (category === 'Kids Toilet' && (!hardwareList || hardwareList.length === 0)) {
    hardwareList = [
      { id: '1', name: 'Nylon Safety Spring Hinges (Soft & Self-Closing Pair)', quantity: 2, unit: 'Pair', material: 'Both' },
      { id: '2', name: 'Emergency Release Coin Latch / Safety Turn Lock', quantity: 1, unit: 'Set', material: 'Both' },
      { id: '3', name: 'Ergonomic Rounded Child Door Knob', quantity: 1, unit: 'Pc', material: 'Both' },
      { id: '4', name: 'Safety Coat & Bag Hook with Soft Buffer Stop', quantity: 1, unit: 'Pc', material: 'Both' },
      { id: '5', name: 'Adjustable Floor Support Legs (100–150mm)', quantity: 2, unit: 'Pcs', material: 'Both' },
    ];
  }

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category,
    subtitle: row.subtitle || '',
    description: row.description || '',
    imageUrl: row.image_url || '',
    additionalImages: Array.isArray(row.additional_images) ? row.additional_images : [],
    videos: Array.isArray(videos) ? videos : [],
    videoUrls: Array.isArray(videos) ? videos : [],
    hardwareOptions: hardwareOptions || [],
    hardwareList: hardwareList || [],
    specifications: finalSpecs,
    features: Array.isArray(row.features) ? row.features : [],
    applications: Array.isArray(row.applications) ? row.applications : [],
    colors: Array.isArray(row.colors)
      ? row.colors.map((c: any) => ({ name: c.name || '', imageUrl: c.image_url || c.imageUrl || '' }))
      : [],
    hasExtraLeg: Boolean(hasExtraLeg),
    tierCount: tierCount || '',
    sortOrder: row.sort_order ?? 0,
    published: row.published !== false,
    isFeatured: Boolean(row.is_featured),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapModelToDbRow(model: ProductCatalogModel) {
  const cleanVideos = (model.videos || model.videoUrls || [])
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean);

  const specifications = [
    ...(model.specifications || []).filter((s) => !s.label.startsWith('__')),
    {
      label: '__hardware_meta',
      value: {
        hardwareOptions: model.hardwareOptions,
        hardwareList: model.hardwareList,
        hasExtraLeg: model.hasExtraLeg,
        tierCount: model.tierCount,
        videos: cleanVideos,
      },
    },
  ];

  const colors = (model.colors && model.colors.length > 0)
    ? model.colors.map((c) => ({ name: c.name, image_url: c.imageUrl }))
    : (model.hardwareOptions || [])
        .filter((opt) => opt.colors && opt.colors.length > 0)
        .flatMap((opt) => (opt.colors || []).map((col) => ({ name: col, image_url: '' })));

  return {
    id: isValidUuid(model.id) ? model.id : undefined,
    slug: model.slug,
    title: model.title,
    subtitle: model.subtitle || '',
    description: model.description || '',
    bottom_description: '',
    category: model.category,
    image_url: model.imageUrl,
    additional_images: model.additionalImages || [],
    features: (model.features && model.features.length > 0)
      ? model.features
      : [
          '10-Year Compact Board Warranty',
          '1-Year Hardware Replacement Warranty',
          '100% Water, Moisture & Termite Proof',
          'Heavy Duty Grade 304 SS Hardware',
          'Pan-India Supply & Turnkey Installation',
        ],
    specifications,
    applications: (model.applications && model.applications.length > 0)
      ? model.applications
      : [`Commercial ${model.category}`, 'Public Washrooms', 'Corporate Offices'],
    colors,
    is_featured: model.isFeatured,
    sort_order: model.sortOrder,
    published: model.published,
  };
}

/**
 * Execute a promise/thenable with a generous timeout to prevent hanging.
 * Safely converts Thenables (like Supabase PostgrestBuilder) to native promises.
 */
function withTimeout<T>(thenable: PromiseLike<T> | Promise<T>, timeoutMs = 10000): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Network request timed out')), timeoutMs);
  });
  return Promise.race([
    Promise.resolve(thenable).then(
      (val) => {
        if (timer) clearTimeout(timer);
        return val;
      },
      (err) => {
        if (timer) clearTimeout(timer);
        throw err;
      }
    ),
    timeoutPromise,
  ]);
}

// ── Service Implementation ──────────────────────────────────────────

export const productCatalogApi = {
  // ── Categories ──
  getCategories: (): TopProductCategory[] => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_CATEGORIES_KEY);
      if (cached) {
        const parsed: TopProductCategory[] = JSON.parse(cached);
        const existingKeys = new Set(parsed.map((c) => c.key));
        const missing = DEFAULT_TOP_CATEGORIES.filter((c) => !existingKeys.has(c.key));
        if (missing.length > 0) {
          const merged = [...parsed, ...missing];
          try {
            localStorage.setItem(LOCAL_STORAGE_CATEGORIES_KEY, JSON.stringify(merged));
          } catch {}
          return merged;
        }
        return parsed;
      }
    } catch {}
    return DEFAULT_TOP_CATEGORIES;
  },

  updateCategory: (
    key: ProductCategoryType,
    updates: Partial<TopProductCategory>
  ): TopProductCategory[] => {
    const current = productCatalogApi.getCategories();
    const updated = current.map((cat) =>
      cat.key === key ? { ...cat, ...updates } : cat
    );
    try {
      localStorage.setItem(LOCAL_STORAGE_CATEGORIES_KEY, JSON.stringify(updated));
    } catch {}
    return updated;
  },

  // ── Models (Reliable Database-First with Resilient Local Fallback) ──
  listModels: async (category?: ProductCategoryType, forceRefresh = false): Promise<ProductCatalogModel[]> => {
    const now = Date.now();
    const hasFreshMemory = memoryModelsCache && memoryModelsCache.length > 0;
    const isThrottleActive = now - lastModelsFetchTime < 15000; // 15s throttle on forced re-fetch
    const isWithinTtl = now - lastModelsFetchTime < MODELS_CACHE_TTL_MS;

    // 1. Return in-memory cache if active and not forced (or if force-refresh is spammed within 15s)
    if (hasFreshMemory && (!forceRefresh || isThrottleActive || isWithinTtl)) {
      const active = (memoryModelsCache || []).filter((m) => m.published !== false);
      if (category) {
        return active.filter((m) => m.category === category);
      }
      return active;
    }

    // 2. Check localStorage before hitting remote Supabase if memory is empty
    if (!hasFreshMemory && !forceRefresh) {
      try {
        const cached = localStorage.getItem(LOCAL_STORAGE_MODELS_KEY);
        if (cached) {
          const models: ProductCatalogModel[] = (JSON.parse(cached) || []).filter((m: any) => m.published !== false);
          if (models.length > 0) {
            memoryModelsCache = models;
            lastModelsFetchTime = now;
            if (category) {
              return models.filter((m) => m.category === category);
            }
            return models;
          }
        }
      } catch {}
    }

    // 3. Fetch directly from Supabase products table with selective projection
    if (isSupabaseConfigured()) {
      try {
        const query = supabase
          .from('products')
          .select('id, name, slug, description, category, subcategory, base_price, sort_order, published, is_featured, images, specifications, features, metadata, created_at, updated_at')
          .order('sort_order', { ascending: true });

        const res = (await withTimeout<any>(query as any, 10000)) as any;
        const rows = res?.data;
        const error = res?.error;

        if (!error && Array.isArray(rows)) {
          const remoteModels = rows.map(mapDbRowToModel).filter((m) => m.published !== false);
          memoryModelsCache = remoteModels;
          lastModelsFetchTime = now;
          try {
            localStorage.setItem(LOCAL_STORAGE_MODELS_KEY, JSON.stringify(remoteModels));
          } catch {}
          if (category) {
            return remoteModels.filter((m) => m.category === category);
          }
          return remoteModels;
        } else if (error) {
          console.warn('[productCatalogApi] Supabase query error:', error.message);
        }
      } catch (err: any) {
        console.warn('[productCatalogApi] Supabase network error:', err?.message || err);
      }
    }

    // 4. Fallback to localStorage cache
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_MODELS_KEY);
      if (cached) {
        const models: ProductCatalogModel[] = (JSON.parse(cached) || []).filter((m: any) => m.published !== false);
        memoryModelsCache = models;
        if (category) {
          return models.filter((m) => m.category === category);
        }
        return models;
      }
    } catch {}

    return [];
  },

  getModelById: async (idOrSlug: string): Promise<ProductCatalogModel | null> => {
    if (!idOrSlug) return null;

    // 1. Check in-memory cache
    if (memoryModelsCache && memoryModelsCache.length > 0) {
      const found = memoryModelsCache.find((m) => m.id === idOrSlug || m.slug === idOrSlug);
      if (found) return found;
    }

    // 2. Query Supabase directly
    if (isSupabaseConfigured()) {
      try {
        const query = isValidUuid(idOrSlug)
          ? supabase.from('products').select('*').or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`).limit(1)
          : supabase.from('products').select('*').eq('slug', idOrSlug).limit(1);

        const res = (await withTimeout<any>(query as any, 8000)) as any;
        if (!res?.error && Array.isArray(res?.data) && res.data.length > 0) {
          const m = mapDbRowToModel(res.data[0]);
          return m;
        }
      } catch (err) {
        console.warn('[productCatalogApi] getModelById error:', err);
      }
    }

    // 3. Fallback to listModels
    const all = await productCatalogApi.listModels(undefined, true);
    return all.find((m) => m.id === idOrSlug || m.slug === idOrSlug) || null;
  },

  saveModel: async (model: ProductCatalogModel): Promise<ProductCatalogModel> => {
    const now = new Date().toISOString();
    const modelToSave: ProductCatalogModel = {
      ...model,
      updatedAt: now,
      createdAt: model.createdAt || now,
    };

    if (isSupabaseConfigured()) {
      try {
        const payload = mapModelToDbRow(modelToSave);
        const res: any = await withTimeout(
          supabase.from('products').upsert(payload as any, { onConflict: 'slug' }).select() as any,
          10000
        );
        if (res?.error) {
          console.error('[productCatalogApi] Supabase save error:', res.error.message);
          throw new Error(res.error.message || 'Failed to save product in database');
        } else if (res?.data && res.data[0]?.id) {
          modelToSave.id = res.data[0].id;
        }
      } catch (err: any) {
        console.error('[productCatalogApi] Supabase save exception:', err);
        throw err;
      }
    }

    // Refresh model cache immediately
    await productCatalogApi.listModels(undefined, true);
    return modelToSave;
  },

  toggleFeatured: async (id: string, isFeatured: boolean): Promise<ProductCatalogModel | null> => {
    const target = await productCatalogApi.getModelById(id);
    if (!target) return null;
    const updatedModel: ProductCatalogModel = { ...target, isFeatured };
    return await productCatalogApi.saveModel(updatedModel);
  },

  deleteModel: async (id: string): Promise<boolean> => {
    if (isSupabaseConfigured()) {
      try {
        const query = isValidUuid(id)
          ? supabase.from('products').delete().eq('id', id)
          : supabase.from('products').delete().eq('slug', id);
        await withTimeout(query as any, 8000);
      } catch (err) {
        console.warn('[productCatalogApi] Supabase delete error:', err);
      }
    }

    // Refresh cache immediately
    await productCatalogApi.listModels(undefined, true);
    return true;
  },

  clearAllModels: async (): Promise<boolean> => {
    memoryModelsCache = [];
    try {
      localStorage.setItem(LOCAL_STORAGE_MODELS_KEY, JSON.stringify([]));
    } catch {}

    if (isSupabaseConfigured()) {
      try {
        await withTimeout(
          supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000') as any,
          5000
        );
      } catch {}
    }
    return true;
  },

  seedDefaultCatalog: async (): Promise<ProductCatalogModel[]> => {
    memoryModelsCache = [];
    try {
      localStorage.setItem(LOCAL_STORAGE_CATEGORIES_KEY, JSON.stringify(DEFAULT_TOP_CATEGORIES));
      localStorage.setItem(LOCAL_STORAGE_MODELS_KEY, JSON.stringify([]));
    } catch {}
    return [];
  },
};
