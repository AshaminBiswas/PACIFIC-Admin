/**
 * ImageKit.io Cloud Media Storage Client & Utilities
 * Primary media engine for images, videos, and catalog assets.
 * Stores files on ImageKit.io CDN and returns public CDN URLs for database persistence.
 */
import { optimizeImageBeforeUpload, optimizeMultipleImagesBeforeUpload } from "../utils/imageOptimizer";

export const IMAGEKIT_PUBLIC_KEY =
  (import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY as string) || "public_DlFE0TdGBcX1Tv0hlh5ze0dKmLc=";
export const IMAGEKIT_PRIVATE_KEY =
  (import.meta.env.VITE_IMAGEKIT_PRIVATE_KEY as string) || "private_UVJjNf4dKFHSix/PFXNniXQdSJo=";
export const IMAGEKIT_URL_ENDPOINT =
  (import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT as string) || "https://ik.imagekit.io/1r254icf2";

const IMAGEKIT_UPLOAD_ENDPOINT = "https://upload.imagekit.io/api/v1/files/upload";
const IMAGEKIT_API_ENDPOINT = "https://api.imagekit.io/v1/files";

function getAuthHeader(): string {
  const token = `${IMAGEKIT_PRIVATE_KEY}:`;
  if (typeof btoa === "function") {
    return `Basic ${btoa(token)}`;
  }
  return `Basic ${token}`;
}

export function isImageKitConfigured(): boolean {
  return Boolean(IMAGEKIT_PRIVATE_KEY && IMAGEKIT_URL_ENDPOINT);
}

export interface ImageKitUploadResult {
  fileId: string;
  name: string;
  url: string;
  filePath: string;
  thumbnailUrl?: string;
  fileType: string;
  size: number;
}

/**
 * Optimize standard image files before upload to reduce payload size and speed up transmission.
 * Preserves SVG vectors, animated GIFs, and non-image blobs.
 */
async function optimizeImageForUpload(file: File): Promise<File> {
  const result = await optimizeImageBeforeUpload(file);
  return result.file;
}

/**
 * Core ImageKit Upload Routine
 */
export async function uploadToImageKit(
  file: File | Blob,
  fileName: string,
  folder: string = "products"
): Promise<ImageKitUploadResult> {
  const cleanFolder = folder.startsWith("/") ? folder : `/${folder}`;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("fileName", fileName);
  formData.append("folder", cleanFolder);
  formData.append("useUniqueFileName", "true");

  const response = await fetch(IMAGEKIT_UPLOAD_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(),
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ImageKit upload failed with status ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data as ImageKitUploadResult;
}

/**
 * Upload an image to ImageKit.io CDN.
 * Returns the public ImageKit URL to be saved in the database.
 */
export async function uploadImageToImageKit(
  file: File,
  folder: string = "products"
): Promise<string | null> {
  try {
    const processedFile = await optimizeImageForUpload(file);
    const ext =
      processedFile.type === "image/webp"
        ? "webp"
        : processedFile.name.split(".").pop() || "jpg";
    const cleanBaseName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName = `${Date.now()}_${cleanBaseName}.${ext}`;

    const result = await uploadToImageKit(processedFile, fileName, folder);
    return result.url;
  } catch (error) {
    console.error("[ImageKit] Image upload error:", error);
    return null;
  }
}

/**
 * Upload multiple images to ImageKit.io in parallel.
 * Returns an array of public ImageKit URLs.
 */
export async function uploadMultipleImagesToImageKit(
  files: File[],
  folder: string = "products"
): Promise<string[]> {
  const uploadPromises = Array.from(files).map((f) => uploadImageToImageKit(f, folder));
  const results = await Promise.all(uploadPromises);
  return results.filter((url): url is string => Boolean(url));
}

/**
 * Upload a video file (.mp4, .webm, .mov) directly to ImageKit.io CDN.
 * Returns the public ImageKit URL to be stored in the database.
 */
export async function uploadVideoToImageKit(
  file: File,
  folder: string = "videos"
): Promise<string | null> {
  try {
    const cleanBaseName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
    const ext = file.name.split(".").pop() || "mp4";
    const fileName = `${Date.now()}_${cleanBaseName}.${ext}`;

    const result = await uploadToImageKit(file, fileName, folder);
    return result.url;
  } catch (error) {
    console.error("[ImageKit] Video upload error:", error);
    return null;
  }
}

/**
 * Upload document or catalog file (PDF, etc.) to ImageKit.io.
 * Returns { url, size } with public ImageKit URL.
 */
export async function uploadFileToImageKit(
  file: File,
  folder: string = "catalogs"
): Promise<{ url: string; size: number } | null> {
  try {
    const isImage = file.type.startsWith("image/");
    const processedFile = isImage ? await optimizeImageForUpload(file) : file;

    const cleanBaseName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
    const ext =
      isImage && processedFile.type === "image/webp"
        ? "webp"
        : file.name.split(".").pop() || "bin";
    const fileName = `${Date.now()}_${cleanBaseName}.${ext}`;

    const result = await uploadToImageKit(processedFile, fileName, folder);
    return { url: result.url, size: processedFile.size };
  } catch (error) {
    console.error("[ImageKit] Document upload error:", error);
    return null;
  }
}

/**
 * Delete a file from ImageKit.io using its URL.
 */
export async function deleteFromImageKit(url: string): Promise<boolean> {
  if (!url || !url.includes("imagekit.io")) return false;

  try {
    const fileName = url.split("/").pop()?.split("?")[0];
    if (!fileName) return false;

    // Search for file ID on ImageKit
    const searchUrl = `${IMAGEKIT_API_ENDPOINT}?searchQuery=${encodeURIComponent(`name="${fileName}"`)}`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        Authorization: getAuthHeader(),
      },
    });

    if (searchRes.ok) {
      const files = await searchRes.json();
      if (Array.isArray(files) && files.length > 0) {
        const fileId = files[0].fileId || files[0].id;
        if (fileId) {
          const delRes = await fetch(`${IMAGEKIT_API_ENDPOINT}/${fileId}`, {
            method: "DELETE",
            headers: {
              Authorization: getAuthHeader(),
            },
          });
          return delRes.ok;
        }
      }
    }
  } catch (err) {
    console.warn("[ImageKit] Delete error:", err);
  }
  return false;
}
