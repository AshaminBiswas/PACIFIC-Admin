import { supabase } from "./supabase";
import type { Blog } from "./database.types";

export type BlogPublicationStatus = "DRAFT" | "PUBLISHED" | "SCHEDULED" | "ARCHIVED";

export interface BlogMetadata {
  seoTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  readingTime?: string;
  isFeatured?: boolean;
  scheduledAt?: string | null;
  status?: BlogPublicationStatus;
}

export interface BlogPost extends Blog {
  seo_title?: string;
  meta_description?: string;
  canonical_url?: string;
  og_title?: string;
  og_description?: string;
  og_image?: string;
  reading_time?: string;
  is_featured?: boolean;
  scheduled_at?: string | null;
  status?: BlogPublicationStatus;
}

export const BLOG_CATEGORIES: string[] = [
  "Restroom Cubicles",
  "Toilet Partitions",
  "Urinal Screens",
  "Locker Systems",
  "HPL Compact Materials",
  "Architectural Hardware",
  "Commercial Washrooms",
  "Installation & Maintenance",
  "Case Studies",
  "Industry Guides",
];

export const BLOG_AUTHORS: string[] = [
  "Pacific Team",
  "Technical Desk",
  "Project Engineering Lead",
  "Design & Architecture Consultant",
];

// ── Serialization & Extraction ───────────────────────────────────────────

const META_PREFIX = "<!--PRC_BLOG_META:";
const META_SUFFIX = "-->";

/**
 * Packages extended editorial metadata inside the content field as an HTML comment.
 * This guarantees 100% compatibility across PostgreSQL / Supabase tables without schema errors.
 */
export function packContentWithMeta(html: string, meta: BlogMetadata): string {
  const cleanHtml = html.replace(/<!--PRC_BLOG_META:[\s\S]*?-->/g, "").trim();
  const metaJson = JSON.stringify(meta);
  return `${cleanHtml}\n\n${META_PREFIX}${metaJson}${META_SUFFIX}`;
}

/**
 * Extracts and unpacks extended editorial metadata from the raw content field.
 */
export function unpackContentWithMeta(rawContent: string | undefined | null): {
  html: string;
  meta: BlogMetadata;
} {
  if (!rawContent) {
    return { html: "", meta: {} };
  }
  const match = rawContent.match(/<!--PRC_BLOG_META:([\s\S]*?)-->/);
  if (!match) {
    return { html: rawContent, meta: {} };
  }
  try {
    const meta = JSON.parse(match[1]);
    const cleanHtml = rawContent.replace(/<!--PRC_BLOG_META:[\s\S]*?-->/g, "").trim();
    return { html: cleanHtml, meta };
  } catch {
    return { html: rawContent, meta: {} };
  }
}

/**
 * Normalizes raw Supabase row into a complete BlogPost object with hydrated metadata.
 */
export function hydrateBlogPost(row: Blog): BlogPost {
  const { html, meta } = unpackContentWithMeta(row.content);

  // Derive status
  let resolvedStatus: BlogPublicationStatus = "DRAFT";
  if (meta.status) {
    resolvedStatus = meta.status;
  } else if (row.published) {
    if (meta.scheduledAt && new Date(meta.scheduledAt) > new Date()) {
      resolvedStatus = "SCHEDULED";
    } else {
      resolvedStatus = "PUBLISHED";
    }
  }

  // Calculate default reading time if not stored
  const readingTime = meta.readingTime || calculateReadingTime(html);

  return {
    ...row,
    content: html,
    seo_title: meta.seoTitle || row.title,
    meta_description: meta.metaDescription || row.excerpt,
    canonical_url: meta.canonicalUrl || `/blog/${row.slug}`,
    og_title: meta.ogTitle || meta.seoTitle || row.title,
    og_description: meta.ogDescription || meta.metaDescription || row.excerpt,
    og_image: meta.ogImage || row.cover_image_url,
    reading_time: readingTime,
    is_featured: meta.isFeatured ?? false,
    scheduled_at: meta.scheduledAt ?? null,
    status: resolvedStatus,
  };
}

// ── Utility Functions ───────────────────────────────────────────────────────

export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function calculateReadingTime(htmlOrText: string, wordsPerMinute = 200): string {
  const text = htmlOrText.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const words = text ? text.split(" ").length : 0;
  const minutes = Math.max(1, Math.ceil(words / wordsPerMinute));
  return `${minutes} min read`;
}

// ── Database Operations ─────────────────────────────────────────────────────

export async function fetchAllBlogs(): Promise<BlogPost[]> {
  const { data, error } = await supabase
    .from("blogs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[blogService] Error fetching blogs:", error);
    throw error;
  }

  return (data || []).map((row: Blog) => hydrateBlogPost(row));
}

export async function fetchBlogById(id: string): Promise<BlogPost | null> {
  const { data, error } = await supabase
    .from("blogs")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("[blogService] Error fetching blog by ID:", error);
    throw error;
  }

  return data ? hydrateBlogPost(data as Blog) : null;
}

export async function checkSlugAvailability(slug: string, currentId?: string): Promise<boolean> {
  const normalizedSlug = toSlug(slug);
  let query = supabase.from("blogs").select("id").eq("slug", normalizedSlug);
  if (currentId) {
    query = query.neq("id", currentId);
  }
  const { data, error } = await query;
  if (error) {
    console.error("[blogService] Error checking slug availability:", error);
    return true;
  }
  return (data || []).length === 0;
}

export async function saveBlogPost(post: Partial<BlogPost> & { title: string }): Promise<BlogPost> {
  const rawId = post.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : undefined);
  const slug = toSlug(post.slug || post.title);

  // Verify slug uniqueness
  const isAvailable = await checkSlugAvailability(slug, post.id);
  if (!isAvailable) {
    throw new Error(`The URL slug "${slug}" is already in use by another blog post. Please choose a unique slug.`);
  }

  const status: BlogPublicationStatus = post.status || (post.published ? "PUBLISHED" : "DRAFT");
  const isPublished = status === "PUBLISHED" || (status === "SCHEDULED" && Boolean(post.scheduled_at));

  let publishedAt = post.published_at ?? null;
  if (status === "PUBLISHED" && !publishedAt) {
    publishedAt = new Date().toISOString();
  }

  // Pack extended metadata
  const meta: BlogMetadata = {
    seoTitle: post.seo_title,
    metaDescription: post.meta_description,
    canonicalUrl: post.canonical_url,
    ogTitle: post.og_title,
    ogDescription: post.og_description,
    ogImage: post.og_image,
    readingTime: post.reading_time || calculateReadingTime(post.content || ""),
    isFeatured: post.is_featured ?? false,
    scheduledAt: post.scheduled_at ?? null,
    status,
  };

  const packedContent = packContentWithMeta(post.content || "", meta);

  const payload: any = {
    title: post.title.trim(),
    slug,
    excerpt: (post.excerpt || "").trim(),
    content: packedContent,
    cover_image_url: post.cover_image_url || "",
    alt_text: post.alt_text || null,
    author: post.author || "Pacific Team",
    category: post.category || "General",
    tags: Array.isArray(post.tags) ? post.tags : [],
    published: isPublished,
    published_at: publishedAt,
    updated_at: new Date().toISOString(),
  };

  if (rawId) {
    payload.id = rawId;
  }

  let resultRow: Blog;

  if (post.id) {
    const { data, error } = await supabase
      .from("blogs")
      .update(payload)
      .eq("id", post.id)
      .select()
      .single();

    if (error) {
      console.error("[blogService] Error updating blog:", error);
      throw error;
    }
    resultRow = data as Blog;
  } else {
    payload.created_at = new Date().toISOString();
    const { data, error } = await supabase
      .from("blogs")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("[blogService] Error inserting blog:", error);
      throw error;
    }
    resultRow = data as Blog;
  }

  return hydrateBlogPost(resultRow);
}

export async function deleteBlogPost(id: string): Promise<void> {
  const { error } = await supabase.from("blogs").delete().eq("id", id);
  if (error) {
    console.error("[blogService] Error deleting blog:", error);
    throw error;
  }
}

export async function duplicateBlogPost(id: string): Promise<BlogPost> {
  const original = await fetchBlogById(id);
  if (!original) {
    throw new Error("Original post not found.");
  }

  const baseSlug = toSlug(`${original.slug}-copy`);
  let candidateSlug = baseSlug;
  let counter = 1;
  while (!(await checkSlugAvailability(candidateSlug))) {
    candidateSlug = `${baseSlug}-${counter}`;
    counter++;
  }

  const duplicatedPayload: Partial<BlogPost> & { title: string } = {
    title: `${original.title} (Copy)`,
    slug: candidateSlug,
    excerpt: original.excerpt,
    content: original.content,
    cover_image_url: original.cover_image_url,
    alt_text: original.alt_text,
    author: original.author,
    category: original.category,
    tags: [...original.tags],
    published: false,
    status: "DRAFT",
    published_at: null,
    scheduled_at: null,
    seo_title: original.seo_title,
    meta_description: original.meta_description,
    canonical_url: `/blog/${candidateSlug}`,
    is_featured: false,
    reading_time: original.reading_time,
  };

  return saveBlogPost(duplicatedPayload);
}

export async function toggleBlogPublication(id: string, publish: boolean): Promise<BlogPost> {
  const blog = await fetchBlogById(id);
  if (!blog) throw new Error("Blog post not found");

  const newStatus: BlogPublicationStatus = publish ? "PUBLISHED" : "DRAFT";
  const newPublishedAt = publish ? (blog.published_at || new Date().toISOString()) : null;

  const meta: BlogMetadata = {
    seoTitle: blog.seo_title,
    metaDescription: blog.meta_description,
    canonicalUrl: blog.canonical_url,
    ogTitle: blog.og_title,
    ogDescription: blog.og_description,
    ogImage: blog.og_image,
    readingTime: blog.reading_time,
    isFeatured: blog.is_featured,
    scheduledAt: publish ? null : blog.scheduled_at,
    status: newStatus,
  };

  const packedContent = packContentWithMeta(blog.content, meta);

  const { data, error } = await supabase
    .from("blogs")
    .update({
      published: publish,
      published_at: newPublishedAt,
      content: packedContent,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return hydrateBlogPost(data as Blog);
}
