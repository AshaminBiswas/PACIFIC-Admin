/**
 * Auto-generated–style type definitions for the Supabase database.
 * Mirrors the schema created by supabase-schema.sql.
 */

export interface Database {
  public: {
    Tables: {
      products: {
        Row: Product;
        Insert: Partial<Product> & Pick<Product, "slug" | "title">;
        Update: Partial<Product>;
      };
      blogs: {
        Row: Blog;
        Insert: Partial<Blog> & Pick<Blog, "slug" | "title" | "content">;
        Update: Partial<Blog>;
      };
      solutions: {
        Row: Solution;
        Insert: Partial<Solution> & Pick<Solution, "slug" | "title">;
        Update: Partial<Solution>;
      };
      gallery_images: {
        Row: GalleryImage;
        Insert: Partial<GalleryImage> & Pick<GalleryImage, "title" | "image_url">;
        Update: Partial<GalleryImage>;
      };
      hero_images: {
        Row: HeroImage;
        Insert: Partial<HeroImage> & Pick<HeroImage, "url">;
        Update: Partial<HeroImage>;
      };
      core_services: {
        Row: CoreService;
        Insert: Partial<CoreService> & Pick<CoreService, "title" | "image_url">;
        Update: Partial<CoreService>;
      };
      page_banners: {
        Row: PageBanner;
        Insert: Partial<PageBanner> & Pick<PageBanner, "page_slug" | "image_url">;
        Update: Partial<PageBanner>;
      };
      catalogs: {
        Row: Catalog;
        Insert: Partial<Catalog> & Pick<Catalog, "title" | "file_url">;
        Update: Partial<Catalog>;
      };
      contact_queries: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string;
          company: string | null;
          requirement: string | null;
          message: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          phone: string;
          company?: string | null;
          requirement?: string | null;
          message?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          phone?: string;
          company?: string | null;
          requirement?: string | null;
          message?: string | null;
          status?: string;
          created_at?: string;
        };
      };
      feedback: {
        Row: {
          id: string;
          name: string;
          company: string | null;
          stars: number;
          message: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          company?: string | null;
          stars: number;
          message: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          company?: string | null;
          stars?: number;
          message?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never
    };
    Functions: {
      [_ in never]: never
    };
    Enums: {
      [_ in never]: never
    };
    CompositeTypes: {
      [_ in never]: never
    };
  };
}

// ── Row types ─────────────────────────────────────────────────

export interface ProductColor {
  name: string;
  image_url: string;
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  bottom_description?: string;
  category: string;
  image_url: string;
  alt_text?: string | null;
  additional_images: string[];
  features: string[];
  specifications: { label: string; value: string }[];
  applications: string[];
  colors?: ProductColor[];
  is_featured: boolean;
  sort_order: number;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Blog {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  cover_image_url: string;
  alt_text?: string | null;
  author: string;
  category: string;
  tags: string[];
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Solution {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  bottom_description?: string;
  icon_name: string;
  image_url: string;
  alt_text?: string | null;
  additional_images: string[];
  features: string[];
  clients: string[];
  colors?: ProductColor[];
  sort_order: number;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface GalleryImage {
  id: string;
  title: string;
  category: string;
  location_slug: string | null;
  placement: 'general' | 'hero' | 'gallery';
  image_url: string;
  alt_text?: string | null;
  sort_order: number;
  published: boolean;
  created_at: string;
}

export interface HeroImage {
  id: string;
  url: string;
  alt_text?: string | null;
  description: string;
  sort_order: number;
  created_at: string;
}

export interface CoreService {
  id: string;
  title: string;
  description: string;
  image_url: string;
  alt_text?: string | null;
  sort_order: number;
  created_at: string;
}

export interface PageBanner {
  id: string;
  page_slug: string; // 'about' | 'services' | 'solutions' | 'gallery'
  image_url: string;
  alt_text?: string | null;
  title: string;
  subtitle: string;
  created_at: string;
}

export interface Catalog {
  id: string;
  title: string;
  description: string;
  file_url: string;
  file_type: 'pdf' | 'image';
  file_size: number;            // bytes
  thumbnail_url: string;
  product_id: string | null;
  document_type: string;
  category: string;
  sort_order: number;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContactQuery {
  id?: string;           // auto-generated by the database (uuid default)
  name: string;
  email: string;
  phone: string;
  company: string | null;
  requirement: string | null;
  message: string | null;
  status?: string;       // defaults to 'new' in the database
  created_at?: string;   // set by the database automatically
}

export interface Feedback {
  id?: string;           // auto-generated by the database
  name: string;
  company?: string | null;
  stars: number;         // 1–5
  message: string;
  created_at?: string;   // set by the database automatically
}
