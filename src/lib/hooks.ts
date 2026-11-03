/**
 * React hooks for fetching data from Supabase with demo-data fallback.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";
import type { Product, Blog, Solution, GalleryImage, HeroImage, CoreService, PageBanner, Catalog } from "./database.types";
import {
  demoProducts,
  demoBlogs,
  demoSolutions,
  demoGalleryImages,
} from "./demo-data";

// ── In-memory & Persistent Session Request Cache ─────────────
// Stores already-fetched data so navigating back to a page is instant with ZERO Origin Egress.
// Cache is busted only when `refetch()` is explicitly called or TTL expires.
const memCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const SESSION_HOOK_PREFIX = 'prc_hook_cache_v2_';

export function getCached<T>(key: string): T[] | null {
  // 1. In-memory check
  const entry = memCache.get(key);
  if (entry) {
    if (Date.now() - entry.timestamp <= CACHE_TTL_MS) {
      return entry.data as T[];
    }
    memCache.delete(key);
  }

  // 2. SessionStorage check (persists across page reloads)
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const raw = sessionStorage.getItem(`${SESSION_HOOK_PREFIX}${key}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Date.now() - parsed.timestamp <= CACHE_TTL_MS) {
          memCache.set(key, parsed);
          return parsed.data as T[];
        }
        sessionStorage.removeItem(`${SESSION_HOOK_PREFIX}${key}`);
      }
    } catch {}
  }

  return null;
}

export function setCache<T>(key: string, data: T[]): void {
  const entry = { data, timestamp: Date.now() };
  memCache.set(key, entry);
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      sessionStorage.setItem(`${SESSION_HOOK_PREFIX}${key}`, JSON.stringify(entry));
    } catch {}
  }
}

export function invalidateHookCache(keyPattern?: string): void {
  if (!keyPattern) {
    memCache.clear();
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        const toRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k && k.startsWith(SESSION_HOOK_PREFIX)) toRemove.push(k);
        }
        toRemove.forEach((k) => sessionStorage.removeItem(k));
      } catch {}
    }
    return;
  }
  for (const k of memCache.keys()) {
    if (k.includes(keyPattern)) memCache.delete(k);
  }
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith(SESSION_HOOK_PREFIX) && k.includes(keyPattern)) toRemove.push(k);
      }
      toRemove.forEach((k) => sessionStorage.removeItem(k));
    } catch {}
  }
}


// ── Generic helpers ──────────────────────────────────────────

interface UseDataResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

interface UseSingleResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// ── Products ─────────────────────────────────────────────────

export function useProducts(featuredOnly = false): UseDataResult<Product> {
  const cacheKey = `products:${featuredOnly}`;
  const [data, setData] = useState<Product[]>(() => getCached<Product>(cacheKey) ?? []);
  const [loading, setLoading] = useState(() => !getCached<Product>(cacheKey));
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (bust = false) => {
    if (!bust) {
      const cached = getCached<Product>(cacheKey);
      if (cached) { setData(cached); setLoading(false); return; }
    }
    setLoading(true);
    setError(null);

    if (!isSupabaseConfigured()) {
      const filtered = featuredOnly
        ? demoProducts.filter((p) => p.is_featured)
        : demoProducts;
      setCache(cacheKey, filtered);
      setData(filtered);
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from("products")
        .select("*")
        .eq("published", true)
        .order("sort_order", { ascending: true });

      if (featuredOnly) {
        query = query.eq("is_featured", true);
      }

      const { data: rows, error: err } = await query;
      if (err) throw err;
      const result = (rows as Product[]) || [];
      setCache(cacheKey, result);
      setData(result);
    } catch (e: any) {
      console.error("Failed to fetch products:", e);
      setError(e.message);
      const filtered = featuredOnly
        ? demoProducts.filter((p) => p.is_featured)
        : demoProducts;
      setData(filtered);
    } finally {
      setLoading(false);
    }
  }, [featuredOnly, cacheKey]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: () => fetchData(true) };
}

export function useProduct(slug: string | undefined): UseSingleResult<Product> {
  const [data, setData] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }

    async function fetch() {
      setLoading(true);

      if (!isSupabaseConfigured()) {
        const found = demoProducts.find((p) => p.slug === slug) || null;
        setData(found);
        setLoading(false);
        return;
      }

      try {
        const { data: row, error: err } = await supabase
          .from("products")
          .select("*")
          .eq("slug", slug!)
          .single();
        if (err) throw err;
        setData(row as Product);
      } catch (e: any) {
        console.error("Failed to fetch product:", e);
        setError(e.message);
        setData(demoProducts.find((p) => p.slug === slug) || null);
      } finally {
        setLoading(false);
      }
    }

    fetch();
  }, [slug]);

  return { data, loading, error };
}

// ── Solutions ────────────────────────────────────────────────

export function useSolutions(): UseDataResult<Solution> {
  const cacheKey = 'solutions';
  const [data, setData] = useState<Solution[]>(() => getCached<Solution>(cacheKey) ?? []);
  const [loading, setLoading] = useState(() => !getCached<Solution>(cacheKey));
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (bust = false) => {
    if (!bust) {
      const cached = getCached<Solution>(cacheKey);
      if (cached) { setData(cached); setLoading(false); return; }
    }
    setLoading(true);
    setError(null);

    if (!isSupabaseConfigured()) {
      setCache(cacheKey, demoSolutions);
      setData(demoSolutions);
      setLoading(false);
      return;
    }

    try {
      const { data: rows, error: err } = await supabase
        .from("solutions")
        .select("*")
        .eq("published", true)
        .order("sort_order", { ascending: true });
      if (err) throw err;
      const result = (rows as Solution[]) || [];
      setCache(cacheKey, result);
      setData(result);
    } catch (e: any) {
      setError(e.message);
      setData(demoSolutions);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: () => fetchData(true) };
}

export function useSolution(slug: string | undefined): UseSingleResult<Solution> {
  const [data, setData] = useState<Solution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }

    async function fetch() {
      setLoading(true);

      if (!isSupabaseConfigured()) {
        setData(demoSolutions.find((s) => s.slug === slug) || null);
        setLoading(false);
        return;
      }

      try {
        const { data: row, error: err } = await supabase
          .from("solutions")
          .select("*")
          .eq("slug", slug!)
          .single();
        if (err) throw err;
        setData(row as Solution);
      } catch (e: any) {
        setError(e.message);
        setData(demoSolutions.find((s) => s.slug === slug) || null);
      } finally {
        setLoading(false);
      }
    }

    fetch();
  }, [slug]);

  return { data, loading, error };
}

// ── Blogs ────────────────────────────────────────────────────

export function useBlogs(): UseDataResult<Blog> {
  const cacheKey = 'blogs';
  const [data, setData] = useState<Blog[]>(() => getCached<Blog>(cacheKey) ?? []);
  const [loading, setLoading] = useState(() => !getCached<Blog>(cacheKey));
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (bust = false) => {
    if (!bust) {
      const cached = getCached<Blog>(cacheKey);
      if (cached) { setData(cached); setLoading(false); return; }
    }
    setLoading(true);
    setError(null);

    if (!isSupabaseConfigured()) {
      setCache(cacheKey, demoBlogs);
      setData(demoBlogs);
      setLoading(false);
      return;
    }

    try {
      const { data: rows, error: err } = await supabase
        .from("blogs")
        .select("*")
        .eq("published", true)
        .order("published_at", { ascending: false });
      if (err) throw err;
      const result = (rows as Blog[]) || [];
      setCache(cacheKey, result);
      setData(result);
    } catch (e: any) {
      setError(e.message);
      setData(demoBlogs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: () => fetchData(true) };
}

export function useBlog(slug: string | undefined): UseSingleResult<Blog> {
  const [data, setData] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }

    async function fetch() {
      setLoading(true);

      if (!isSupabaseConfigured()) {
        setData(demoBlogs.find((b) => b.slug === slug) || null);
        setLoading(false);
        return;
      }

      try {
        const { data: row, error: err } = await supabase
          .from("blogs")
          .select("*")
          .eq("slug", slug!)
          .single();
        if (err) throw err;
        setData(row as Blog);
      } catch (e: any) {
        setError(e.message);
        setData(demoBlogs.find((b) => b.slug === slug) || null);
      } finally {
        setLoading(false);
      }
    }

    fetch();
  }, [slug]);

  return { data, loading, error };
}

// ── Gallery ──────────────────────────────────────────────────

export function useGallery(): UseDataResult<GalleryImage> {
  const [data, setData] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!isSupabaseConfigured()) {
      setData(demoGalleryImages);
      setLoading(false);
      return;
    }

    try {
      const { data: rows, error: err } = await supabase
        .from("gallery_images")
        .select("*")
        .eq("published", true)
        .order("sort_order", { ascending: true });
      if (err) throw err;
      setData((rows as GalleryImage[]) || []);
    } catch (e: any) {
      setError(e.message);
      setData(demoGalleryImages);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useLocationGallery(locationSlug: string | undefined): UseDataResult<GalleryImage> {
  const [data, setData] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!locationSlug) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    if (!isSupabaseConfigured()) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      const { data: rows, error: err } = await supabase
        .from("gallery_images")
        .select("*")
        .eq("published", true)
        .eq("location_slug", locationSlug)
        .order("sort_order", { ascending: true });
      if (err) throw err;
      setData((rows as GalleryImage[]) || []);
    } catch (e: any) {
      console.error("Failed to fetch location gallery images:", e);
      setError(e.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [locationSlug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ── Admin hooks (all items, including unpublished) ───────────

export function useAdminProducts(): UseDataResult<Product> {
  const cacheKey = "admin_products";
  const [data, setData] = useState<Product[]>(() => getCached<Product>(cacheKey) ?? []);
  const [loading, setLoading] = useState(() => !getCached<Product>(cacheKey));
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (bust = false) => {
    if (!bust) {
      const cached = getCached<Product>(cacheKey);
      if (cached) {
        setData(cached);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    try {
      const { data: rows, error: err } = await supabase
        .from("products")
        .select("*")
        .order("sort_order", { ascending: true });
      if (err) throw err;
      const result = (rows as Product[]) || [];
      setCache(cacheKey, result);
      setData(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [cacheKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: () => fetchData(true) };
}

export function useAdminBlogs(): UseDataResult<Blog> {
  const cacheKey = "admin_blogs";
  const [data, setData] = useState<Blog[]>(() => getCached<Blog>(cacheKey) ?? []);
  const [loading, setLoading] = useState(() => !getCached<Blog>(cacheKey));
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (bust = false) => {
    if (!bust) {
      const cached = getCached<Blog>(cacheKey);
      if (cached) {
        setData(cached);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    try {
      const { data: rows, error: err } = await supabase
        .from("blogs")
        .select("*")
        .order("created_at", { ascending: false });
      if (err) throw err;
      const result = (rows as Blog[]) || [];
      setCache(cacheKey, result);
      setData(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [cacheKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: () => fetchData(true) };
}

export function useAdminSolutions(): UseDataResult<Solution> {
  const cacheKey = "admin_solutions";
  const [data, setData] = useState<Solution[]>(() => getCached<Solution>(cacheKey) ?? []);
  const [loading, setLoading] = useState(() => !getCached<Solution>(cacheKey));
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (bust = false) => {
    if (!bust) {
      const cached = getCached<Solution>(cacheKey);
      if (cached) {
        setData(cached);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    try {
      const { data: rows, error: err } = await supabase
        .from("solutions")
        .select("*")
        .order("sort_order", { ascending: true });
      if (err) throw err;
      const result = (rows as Solution[]) || [];
      setCache(cacheKey, result);
      setData(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [cacheKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: () => fetchData(true) };
}

export function useAdminGallery(): UseDataResult<GalleryImage> {
  const cacheKey = "admin_gallery";
  const [data, setData] = useState<GalleryImage[]>(() => getCached<GalleryImage>(cacheKey) ?? []);
  const [loading, setLoading] = useState(() => !getCached<GalleryImage>(cacheKey));
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (bust = false) => {
    if (!bust) {
      const cached = getCached<GalleryImage>(cacheKey);
      if (cached) {
        setData(cached);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    try {
      const { data: rows, error: err } = await supabase
        .from("gallery_images")
        .select("*")
        .order("sort_order", { ascending: true });
      if (err) throw err;
      const result = (rows as GalleryImage[]) || [];
      setCache(cacheKey, result);
      setData(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [cacheKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: () => fetchData(true) };
}

// ── Hero Images ──────────────────────────────────────────────

export function useHeroImages(): UseDataResult<HeroImage> {
  const cacheKey = "hero_images_pub";
  const [data, setData] = useState<HeroImage[]>(() => getCached<HeroImage>(cacheKey) ?? []);
  const [loading, setLoading] = useState(() => !getCached<HeroImage>(cacheKey));
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (bust = false) => {
    if (!bust) {
      const cached = getCached<HeroImage>(cacheKey);
      if (cached) {
        setData(cached);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    setError(null);

    if (!isSupabaseConfigured()) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      const { data: rows, error: err } = await supabase
        .from("hero_images")
        .select("*")
        .order("sort_order", { ascending: true });
      if (err) throw err;
      const result = (rows as HeroImage[]) || [];
      setCache(cacheKey, result);
      setData(result);
    } catch (e: any) {
      setError(e.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [cacheKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: () => fetchData(true) };
}

export function useAdminHeroImages(): UseDataResult<HeroImage> {
  const cacheKey = "admin_hero_images";
  const [data, setData] = useState<HeroImage[]>(() => getCached<HeroImage>(cacheKey) ?? []);
  const [loading, setLoading] = useState(() => !getCached<HeroImage>(cacheKey));
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (bust = false) => {
    if (!bust) {
      const cached = getCached<HeroImage>(cacheKey);
      if (cached) {
        setData(cached);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    try {
      const { data: rows, error: err } = await supabase
        .from("hero_images")
        .select("*")
        .order("sort_order", { ascending: true });
      if (err) throw err;
      const result = (rows as HeroImage[]) || [];
      setCache(cacheKey, result);
      setData(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [cacheKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: () => fetchData(true) };
}

// ── Core Services ────────────────────────────────────────────

export function useCoreServices(): UseDataResult<CoreService> {
  const cacheKey = "core_services_pub";
  const [data, setData] = useState<CoreService[]>(() => getCached<CoreService>(cacheKey) ?? []);
  const [loading, setLoading] = useState(() => !getCached<CoreService>(cacheKey));
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (bust = false) => {
    if (!bust) {
      const cached = getCached<CoreService>(cacheKey);
      if (cached) {
        setData(cached);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    setError(null);

    if (!isSupabaseConfigured()) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      const { data: rows, error: err } = await supabase
        .from("core_services")
        .select("*")
        .order("sort_order", { ascending: true });
      if (err) throw err;
      const result = (rows as CoreService[]) || [];
      setCache(cacheKey, result);
      setData(result);
    } catch (e: any) {
      setError(e.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [cacheKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: () => fetchData(true) };
}

export function useAdminCoreServices(): UseDataResult<CoreService> {
  const cacheKey = "admin_core_services";
  const [data, setData] = useState<CoreService[]>(() => getCached<CoreService>(cacheKey) ?? []);
  const [loading, setLoading] = useState(() => !getCached<CoreService>(cacheKey));
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (bust = false) => {
    if (!bust) {
      const cached = getCached<CoreService>(cacheKey);
      if (cached) {
        setData(cached);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    try {
      const { data: rows, error: err } = await supabase
        .from("core_services")
        .select("*")
        .order("sort_order", { ascending: true });
      if (err) throw err;
      const result = (rows as CoreService[]) || [];
      setCache(cacheKey, result);
      setData(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [cacheKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: () => fetchData(true) };
}

// ── Page Banners ──────────────────────────────────────────────

export function usePageBanner(pageSlug: string): UseSingleResult<PageBanner> {
  const [data, setData] = useState<PageBanner | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pageSlug) { setLoading(false); return; }

    const cacheKey = `page_banner:${pageSlug}`;
    const cached = memCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      setData(cached.data as PageBanner);
      setLoading(false);
      return;
    }

    async function fetch() {
      setLoading(true);
      if (!isSupabaseConfigured()) { setLoading(false); return; }
      try {
        const { data: row, error: err } = await supabase
          .from("page_banners")
          .select("*")
          .eq("page_slug", pageSlug)
          .maybeSingle();
        if (err) throw err;
        const banner = row as unknown as PageBanner;
        memCache.set(cacheKey, { data: banner, timestamp: Date.now() });
        setData(banner);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [pageSlug]);

  return { data, loading, error };
}

export function useAdminPageBanners(): UseDataResult<PageBanner> {
  const cacheKey = "admin_page_banners";
  const [data, setData] = useState<PageBanner[]>(() => getCached<PageBanner>(cacheKey) ?? []);
  const [loading, setLoading] = useState(() => !getCached<PageBanner>(cacheKey));
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (bust = false) => {
    if (!bust) {
      const cached = getCached<PageBanner>(cacheKey);
      if (cached) {
        setData(cached);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    try {
      const { data: rows, error: err } = await supabase
        .from("page_banners")
        .select("*")
        .order("page_slug", { ascending: true });
      if (err) throw err;
      const result = (rows as PageBanner[]) || [];
      setCache(cacheKey, result);
      setData(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [cacheKey]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: () => fetchData(true) };
}

// ── Catalogs ─────────────────────────────────────────────────

export function useCatalogs(productId?: string): UseDataResult<Catalog> {
  const cacheKey = `catalogs:${productId || 'all'}`;
  const [data, setData] = useState<Catalog[]>(() => getCached<Catalog>(cacheKey) ?? []);
  const [loading, setLoading] = useState(() => !getCached<Catalog>(cacheKey));
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (bust = false) => {
    if (!bust) {
      const cached = getCached<Catalog>(cacheKey);
      if (cached) { setData(cached); setLoading(false); return; }
    }
    setLoading(true);
    setError(null);

    if (!isSupabaseConfigured()) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from("catalogs")
        .select("*")
        .eq("published", true)
        .order("sort_order", { ascending: true });

      if (productId) {
        query = query.eq("product_id", productId);
      }

      const { data: rows, error: err } = await query;
      if (err) throw err;
      const result = (rows as Catalog[]) || [];
      setCache(cacheKey, result);
      setData(result);
    } catch (e: any) {
      console.error("Failed to fetch catalogs:", e);
      setError(e.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [productId, cacheKey]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: () => fetchData(true) };
}

export function useAdminCatalogs(): UseDataResult<Catalog> {
  const cacheKey = "admin_catalogs";
  const [data, setData] = useState<Catalog[]>(() => getCached<Catalog>(cacheKey) ?? []);
  const [loading, setLoading] = useState(() => !getCached<Catalog>(cacheKey));
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (bust = false) => {
    if (!bust) {
      const cached = getCached<Catalog>(cacheKey);
      if (cached) {
        setData(cached);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    try {
      const { data: rows, error: err } = await supabase
        .from("catalogs")
        .select("*")
        .order("sort_order", { ascending: true });
      if (err) throw err;
      const result = (rows as Catalog[]) || [];
      setCache(cacheKey, result);
      setData(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [cacheKey]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: () => fetchData(true) };
}
