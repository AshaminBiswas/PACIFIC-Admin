import { createClient } from "@supabase/supabase-js";
import imageCompression from "browser-image-compression";
import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "⚠️ Supabase credentials missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY) in your .env file.\n" +
    "The app will run with demo data until credentials are provided."
  );
}

export const supabase = createClient<any>(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key"
);

/**
 * Check whether Supabase is properly configured.
 * Returns false when env vars are missing so the app can fall back to demo data.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

// ── Storage helpers ───────────────────────────────────────────
const BUCKET = "uploads";

async function optimizeImage(file: File): Promise<File> {
  // Keep GIF/SVG untouched to avoid breaking animations/vector assets.
  const skipTypes = ["image/gif", "image/svg+xml"];
  if (skipTypes.includes(file.type)) return file;

  try {
    return await imageCompression(file, {
      maxSizeMB: 1.2,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      initialQuality: 0.8,
      fileType: "image/webp",
    });
  } catch (error) {
    console.warn("Image optimization failed, uploading original file:", error);
    return file;
  }
}

export async function uploadImage(
  file: File,
  folder: string = "images"
): Promise<string | null> {
  const optimizedFile = await optimizeImage(file);
  const ext =
    optimizedFile.type === "image/webp"
      ? "webp"
      : optimizedFile.name.split(".").pop() || "jpg";
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(fileName, optimizedFile, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    console.error("Upload error:", error);
    return null;
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}

/**
 * Upload any file (PDF, image, etc.) to Supabase Storage.
 * Images are optimized; other file types are uploaded as-is.
 */
export async function uploadFile(
  file: File,
  folder: string = "catalogs"
): Promise<{ url: string; size: number } | null> {
  const isImage = file.type.startsWith("image/");
  const processedFile = isImage ? await optimizeImage(file) : file;

  const ext = isImage && processedFile.type === "image/webp"
    ? "webp"
    : file.name.split(".").pop() || "bin";
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(fileName, processedFile, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });

  if (error) {
    console.error("Upload error:", error);
    return null;
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
  return { url: data.publicUrl, size: file.size };
}

export async function deleteImage(url: string): Promise<boolean> {
  // Extract path from full URL
  const pathMatch = url.match(new RegExp(`${BUCKET}/(.+)$`));
  if (!pathMatch) return false;

  const { error } = await supabase.storage.from(BUCKET).remove([pathMatch[1]]);
  return !error;
}
