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

// ── In-memory request cache ───────────────────────────────────
// Stores already-fetched data so navigating back to a page is instant.
// Cache is busted only when `refetch()` is explicitly called.
const memCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCached<T>(key: string): T[] | null {
  const entry = memCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    memCache.delete(key);
    return null;
  }
  return entry.data as T[];
}

function setCache<T>(key: string, data: T[]): void {
  memCache.set(key, { data, timestamp: Date.now() });
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
  const [data, setData] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: rows, error: err } = await supabase
        .from("products")
        .select("*")
        .order("sort_order", { ascending: true });
      if (err) throw err;
      setData((rows as Product[]) || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useAdminBlogs(): UseDataResult<Blog> {
  const [data, setData] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: rows, error: err } = await supabase
        .from("blogs")
        .select("*")
        .order("created_at", { ascending: false });
      if (err) throw err;
      setData((rows as Blog[]) || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useAdminSolutions(): UseDataResult<Solution> {
  const [data, setData] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: rows, error: err } = await supabase
        .from("solutions")
        .select("*")
        .order("sort_order", { ascending: true });
      if (err) throw err;
      setData((rows as Solution[]) || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useAdminGallery(): UseDataResult<GalleryImage> {
  const [data, setData] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: rows, error: err } = await supabase
        .from("gallery_images")
        .select("*")
        .order("sort_order", { ascending: true });
      if (err) throw err;
      setData((rows as GalleryImage[]) || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ── Hero Images ──────────────────────────────────────────────

export function useHeroImages(): UseDataResult<HeroImage> {
  const [data, setData] = useState<HeroImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
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
      setData((rows as HeroImage[]) || []);
    } catch (e: any) {
      setError(e.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useAdminHeroImages(): UseDataResult<HeroImage> {
  const [data, setData] = useState<HeroImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: rows, error: err } = await supabase
        .from("hero_images")
        .select("*")
        .order("sort_order", { ascending: true });
      if (err) throw err;
      setData((rows as HeroImage[]) || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ── Core Services ────────────────────────────────────────────

export function useCoreServices(): UseDataResult<CoreService> {
  const [data, setData] = useState<CoreService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
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
      setData((rows as CoreService[]) || []);
    } catch (e: any) {
      setError(e.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useAdminCoreServices(): UseDataResult<CoreService> {
  const [data, setData] = useState<CoreService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: rows, error: err } = await supabase
        .from("core_services")
        .select("*")
        .order("sort_order", { ascending: true });
      if (err) throw err;
      setData((rows as CoreService[]) || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
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
  const [data, setData] = useState<PageBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: rows, error: err } = await supabase
        .from("page_banners")
        .select("*")
        .order("page_slug", { ascending: true });
      if (err) throw err;
      setData((rows as PageBanner[]) || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
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
  const [data, setData] = useState<Catalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: rows, error: err } = await supabase
        .from("catalogs")
        .select("*")
        .order("sort_order", { ascending: true });
      if (err) throw err;
      setData((rows as Catalog[]) || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
