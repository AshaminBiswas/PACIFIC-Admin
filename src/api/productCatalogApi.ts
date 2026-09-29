import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type {
  ProductCatalogModel,
  TopProductCategory,
  ProductCategoryType,
} from '../types/admin';
import {
  DEFAULT_TOP_CATEGORIES,
  DEFAULT_CATALOG_MODELS,
} from '../data/productCatalogData';

const LOCAL_STORAGE_MODELS_KEY = 'pacific_product_catalog_models_v4';
const LOCAL_STORAGE_CATEGORIES_KEY = 'pacific_product_catalog_categories_v4';

// In-memory cache for ultra-fast instant UI rendering
let memoryModelsCache: ProductCatalogModel[] | null = null;

// Clear outdated legacy caches if present
try {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('pacific_product_catalog_models_v1');
    localStorage.removeItem('pacific_product_catalog_models_v2');
    localStorage.removeItem('pacific_product_catalog_models_v3');
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

  // If not found in __hardware_meta, fallback to defaults or parse
  if (!hardwareOptions || !hardwareList) {
    const defaultMatch = DEFAULT_CATALOG_MODELS.find(
      (m) => m.slug === row.slug || m.title.toLowerCase() === row.title.toLowerCase()
    );
    if (defaultMatch) {
      hardwareOptions = hardwareOptions || defaultMatch.hardwareOptions;
      hardwareList = hardwareList || defaultMatch.hardwareList;
      hasExtraLeg = hasExtraLeg !== undefined ? hasExtraLeg : defaultMatch.hasExtraLeg;
      tierCount = tierCount !== undefined ? tierCount : defaultMatch.tierCount;
    }
  }

  // Filter out internal metadata keys from public specifications
  const cleanSpecs = specs.filter((s: any) => !s.label.startsWith('__'));

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: (row.category as ProductCategoryType) || 'Cubicle',
    subtitle: row.subtitle || '',
    description: row.description || '',
    imageUrl: row.image_url || '',
    additionalImages: Array.isArray(row.additional_images) ? row.additional_images : [],
    videos: Array.isArray(videos) ? videos : [],
    videoUrls: Array.isArray(videos) ? videos : [],
    hardwareOptions: hardwareOptions || [],
    hardwareList: hardwareList || [],
    specifications: cleanSpecs,
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
 * Execute a promise with a hard timeout to prevent Supabase or network resets
 * from hanging the entire application.
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs = 2500): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Network request timed out')), timeoutMs)
    ),
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

  // ── Models (Cache-First, Instant Response) ──
  listModels: async (category?: ProductCategoryType): Promise<ProductCatalogModel[]> => {
    // 1. If in-memory cache has models, return immediately (0ms)
    if (memoryModelsCache && memoryModelsCache.length > 0) {
      if (category) {
        return memoryModelsCache.filter((m) => m.category === category);
      }
      return memoryModelsCache;
    }

    // 2. Read from localStorage immediately (0ms)
    let models: ProductCatalogModel[] = [];
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_MODELS_KEY);
      if (cached) {
        models = JSON.parse(cached);
        memoryModelsCache = models;
      }
    } catch {}

    // 3. Background sync from Supabase with strict timeout
    if (isSupabaseConfigured()) {
      const syncFromSupabase = async () => {
        try {
          let query = supabase
            .from('products')
            .select('*')
            .order('sort_order', { ascending: true });

          const res = (await withTimeout<any>(query as any, 2500)) as any;
          const rows = res?.data;
          const error = res?.error;
          if (!error && Array.isArray(rows) && rows.length > 0) {
            const remoteModels = rows.map(mapDbRowToModel);
            memoryModelsCache = remoteModels;
            try {
              localStorage.setItem(LOCAL_STORAGE_MODELS_KEY, JSON.stringify(remoteModels));
            } catch {}
            return remoteModels;
          }
        } catch {
          // Supabase network error or connection reset handled silently without blocking UI
        }
        return null;
      };

      // If we had no cached models, wait for the short timeout attempt
      if (models.length === 0) {
        const remote = await syncFromSupabase();
        if (remote && remote.length > 0) {
          models = remote;
        }
      } else {
        // Fire background sync silently without blocking UI rendering
        syncFromSupabase();
      }
    }

    if (category) {
      return models.filter((m) => m.category === category);
    }
    return models;
  },

  getModelById: async (idOrSlug: string): Promise<ProductCatalogModel | null> => {
    const all = await productCatalogApi.listModels();
    return all.find((m) => m.id === idOrSlug || m.slug === idOrSlug) || null;
  },

  saveModel: async (model: ProductCatalogModel): Promise<ProductCatalogModel> => {
    const allModels = await productCatalogApi.listModels();
    const now = new Date().toISOString();
    const modelToSave: ProductCatalogModel = {
      ...model,
      updatedAt: now,
      createdAt: model.createdAt || now,
    };

    const existingIdx = allModels.findIndex(
      (m) => m.id === model.id || m.slug === model.slug
    );

    let updatedModels: ProductCatalogModel[];
    if (existingIdx >= 0) {
      updatedModels = [...allModels];
      updatedModels[existingIdx] = modelToSave;
    } else {
      updatedModels = [...allModels, modelToSave];
    }

    // Instantly update cache & localStorage
    memoryModelsCache = updatedModels;
    try {
      localStorage.setItem(LOCAL_STORAGE_MODELS_KEY, JSON.stringify(updatedModels));
    } catch {}

    // Sync with Supabase and retain generated UUID
    if (isSupabaseConfigured()) {
      try {
        const payload = mapModelToDbRow(modelToSave);
        const res: any = await withTimeout(
          supabase.from('products').upsert(payload as any, { onConflict: 'slug' }).select() as any,
          5000
        );
        if (res?.error) {
          console.warn('[Supabase Sync Warning]:', res.error.message);
        } else if (res?.data && res.data[0]?.id) {
          modelToSave.id = res.data[0].id;
          if (existingIdx >= 0) {
            updatedModels[existingIdx] = modelToSave;
          } else {
            updatedModels[updatedModels.length - 1] = modelToSave;
          }
          memoryModelsCache = updatedModels;
          try {
            localStorage.setItem(LOCAL_STORAGE_MODELS_KEY, JSON.stringify(updatedModels));
          } catch {}
        }
      } catch (err: any) {
        console.warn('[Supabase Sync Error]:', err?.message || err);
      }
    }

    return modelToSave;
  },

  toggleFeatured: async (id: string, isFeatured: boolean): Promise<ProductCatalogModel | null> => {
    const allModels = await productCatalogApi.listModels();
    const target = allModels.find((m) => m.id === id);
    if (!target) return null;
    const updatedModel: ProductCatalogModel = { ...target, isFeatured };
    return await productCatalogApi.saveModel(updatedModel);
  },

  deleteModel: async (id: string): Promise<boolean> => {
    const allModels = await productCatalogApi.listModels();
    const target = allModels.find((m) => m.id === id);
    const updated = allModels.filter((m) => m.id !== id);

    memoryModelsCache = updated;
    try {
      localStorage.setItem(LOCAL_STORAGE_MODELS_KEY, JSON.stringify(updated));
    } catch {}

    if (isSupabaseConfigured() && target) {
      (async () => {
        try {
          await withTimeout(
            supabase.from('products').delete().or(`id.eq.${id},slug.eq.${target.slug}`) as any,
            3000
          );
        } catch {}
      })();
    }

    return true;
  },

  clearAllModels: async (): Promise<boolean> => {
    memoryModelsCache = [];
    try {
      localStorage.setItem(LOCAL_STORAGE_MODELS_KEY, JSON.stringify([]));
    } catch {}

    if (isSupabaseConfigured()) {
      (async () => {
        try {
          await withTimeout(
            supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000') as any,
            3000
          );
        } catch {}
      })();
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
