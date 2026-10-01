import { createClient } from "@supabase/supabase-js";
import { optimizeImageBeforeUpload } from "../utils/imageOptimizer";
import type { Database } from "./database.types";

// Production Pacific Supabase Cloud Credentials
export const DEFAULT_SUPABASE_URL = "https://kgalsrokdmsrqysyoffm.supabase.co";
export const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnYWxzcm9rZG1zcnF5c3lvZmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNDY2NjYsImV4cCI6MjEwNTYyMjY2Nn0.o2IfoG0cJmLlYJdiAzd7b9Iko8hQaotEM-yxInqJIqk";
export const DEFAULT_SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnYWxzcm9rZG1zcnF5c3lvZmZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDA0NjY2NiwiZXhwIjoyMTA1NjIyNjY2fQ.GL24GAGFecR-SntNH3Oa_1mmbU8z-lWAeRk3k0V2Gy0";

function isValidSupabaseKey(key?: string): boolean {
  if (!key || typeof key !== "string") return false;
  const trimmed = key.trim();
  if (trimmed.length < 20) return false;
  if (trimmed.includes("placeholder")) return false;
  // Discard unregistered publishable/secret keys that return 401 UNAUTHORIZED_UNREGISTERED_API_KEY
  if (trimmed.startsWith("sb_publishable_0xZl0he") || trimmed.startsWith("sb_secret_HTGNMlNYub")) return false;
  return true;
}

const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string)?.trim();
const supabaseUrl = rawUrl && !rawUrl.includes("placeholder") ? rawUrl : DEFAULT_SUPABASE_URL;

const envCandidates = [
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  import.meta.env.VITE_SUPABASE_SECRET_KEY,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
];

// Prioritize valid JWT keys (starts with eyJ...) over anything else, then fall back to canonical service role key
const resolvedKey =
  envCandidates.find((k) => isValidSupabaseKey(k) && typeof k === "string" && k.startsWith("eyJ")) ||
  envCandidates.find((k) => isValidSupabaseKey(k)) ||
  DEFAULT_SUPABASE_SERVICE_ROLE_KEY;

const supabaseKey = resolvedKey;

export const supabase = createClient<any>(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      fetch: async (url, options = {}) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        try {
          const res = await fetch(url, {
            ...options,
            signal: (options as any)?.signal || controller.signal,
          });

          // Self-heal on 401: If Supabase returns 401 due to expired/stale auth tokens in localStorage or bad apikey
          if (res.status === 401) {
            console.warn("[Supabase Client] Received 401 Unauthorized. Purging stale auth tokens and retrying with valid credentials.");
            try {
              if (typeof window !== "undefined") {
                const keysToRemove: string[] = [];
                for (let i = 0; i < localStorage.length; i++) {
                  const k = localStorage.key(i);
                  if (k && (k.startsWith("sb-") || k.includes("auth-token") || k.includes("supabase"))) {
                    keysToRemove.push(k);
                  }
                }
                keysToRemove.forEach((k) => localStorage.removeItem(k));
              }
            } catch (storageErr) {
              console.warn("[Supabase Client] Could not purge localStorage:", storageErr);
            }

            // Retry with canonical key
            const headers = new Headers((options as any)?.headers || {});
            headers.set("apikey", supabaseKey);
            headers.set("Authorization", `Bearer ${supabaseKey}`);

            return await fetch(url, {
              ...options,
              headers,
              signal: (options as any)?.signal || controller.signal,
            });
          }

          return res;
        } finally {
          clearTimeout(timeout);
        }
      },
    },
  }
);

/**
 * Check whether Supabase is properly configured.
 * Returns false when env vars are missing so the app can fall back to demo data.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseKey && !supabaseUrl.includes("placeholder"));
}

import {
  uploadImageToImageKit,
  uploadMultipleImagesToImageKit,
  uploadVideoToImageKit,
  uploadFileToImageKit,
  deleteFromImageKit,
  isImageKitConfigured,
} from "./imagekit";

// Re-export ImageKit helpers
export {
  uploadImageToImageKit,
  uploadMultipleImagesToImageKit,
  uploadVideoToImageKit,
  uploadFileToImageKit,
  deleteFromImageKit,
  isImageKitConfigured,
};

// ── Storage helpers ───────────────────────────────────────────
const BUCKET = "uploads";

async function optimizeImage(file: File): Promise<File> {
  const result = await optimizeImageBeforeUpload(file);
  return result.file;
}

/**
 * Upload an image: Uses ImageKit.io as the primary cloud storage engine,
 * returning the public ImageKit CDN URL to be stored in the database.
 * ALWAYS optimizes and compresses image to WebP before transmission.
 */
export async function uploadImage(
  file: File,
  folder: string = "images"
): Promise<string | null> {
  // Always optimize and compress before transmission
  const optimizedFile = await optimizeImage(file);

  if (isImageKitConfigured()) {
    try {
      const ikUrl = await uploadImageToImageKit(optimizedFile, folder);
      if (ikUrl) return ikUrl;
    } catch (err) {
      console.warn("[Storage] ImageKit image upload error, trying Supabase fallback:", err);
    }
  }

  // Fallback: Supabase Storage
  try {
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
  } catch (error) {
    console.error("Supabase storage upload error:", error);
    return null;
  }
}

/**
 * Upload any file (PDF, catalog, document, image) to ImageKit.io.
 * Returns { url, size } with the public ImageKit CDN URL.
 * Automatically optimizes images before uploading.
 */
export async function uploadFile(
  file: File,
  folder: string = "catalogs"
): Promise<{ url: string; size: number } | null> {
  const isImage = file.type.startsWith("image/");
  const processedFile = isImage ? await optimizeImage(file) : file;

  if (isImageKitConfigured()) {
    try {
      const ikFile = await uploadFileToImageKit(processedFile, folder);
      if (ikFile) return ikFile;
    } catch (err) {
      console.warn("[Storage] ImageKit file upload error, trying Supabase fallback:", err);
    }
  }

  // Fallback: Supabase Storage
  try {
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
    return { url: data.publicUrl, size: processedFile.size };
  } catch (error) {
    console.error("Supabase file upload error:", error);
    return null;
  }
}

/**
 * Upload multiple images to ImageKit.io in parallel.
 * Returns an array of public ImageKit CDN URLs.
 */
export async function uploadMultipleImages(
  files: File[],
  folder: string = "products"
): Promise<string[]> {
  if (isImageKitConfigured()) {
    try {
      const ikUrls = await uploadMultipleImagesToImageKit(files, folder);
      if (ikUrls && ikUrls.length > 0) return ikUrls;
    } catch (err) {
      console.warn("[Storage] ImageKit batch upload error, trying Supabase fallback:", err);
    }
  }

  const uploads = Array.from(files).map((f) => uploadImage(f, folder));
  const results = await Promise.all(uploads);
  return results.filter((url): url is string => Boolean(url));
}

/**
 * Upload video file (.mp4, .webm, .mov) directly to ImageKit.io.
 * Returns the public ImageKit CDN URL to be stored in the database.
 */
export async function uploadVideo(
  file: File,
  folder: string = "videos"
): Promise<string | null> {
  if (isImageKitConfigured()) {
    try {
      const ikVideoUrl = await uploadVideoToImageKit(file, folder);
      if (ikVideoUrl) return ikVideoUrl;
    } catch (err) {
      console.warn("[Storage] ImageKit video upload error, trying Supabase fallback:", err);
    }
  }

  // Fallback: Supabase Storage
  try {
    const ext = file.name.split(".").pop() || "mp4";
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error } = await supabase.storage.from(BUCKET).upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "video/mp4",
    });

    if (error) {
      console.error("Video upload error:", error);
      return null;
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
    return data.publicUrl;
  } catch (error) {
    console.error("Supabase video upload error:", error);
    return null;
  }
}

/**
 * Delete a media file from ImageKit.io (or Supabase fallback).
 */
export async function deleteImage(url: string): Promise<boolean> {
  if (!url) return false;

  if (url.includes("imagekit.io")) {
    const deleted = await deleteFromImageKit(url);
    if (deleted) return true;
  }

  // Extract path from full URL for Supabase
  const pathMatch = url.match(new RegExp(`${BUCKET}/(.+)$`));
  if (!pathMatch) return false;

  const { error } = await supabase.storage.from(BUCKET).remove([pathMatch[1]]);
  return !error;
}

