/**
 * OpenAI Image & Multi-Angle Gallery Generation Service
 * Analyzes the uploaded model cover photo and automatically generates
 * 4 new architectural photos in 4:3 ratio from distinct camera angles:
 *  1. Wide 45° Isometric Architectural View
 *  2. Macro Hardware Detail Close-Up (SS / Nylon)
 *  3. Interior Cabin & Door Ajar View
 *  4. Low-Angle Structural & Floor Clearance Elevation
 *
 * All generated images are cropped to 4:3 aspect ratio and uploaded
 * directly to ImageKit.io CDN, returning public CDN URLs for the database.
 */
import OpenAI from "openai";
import { uploadToImageKit } from "./imagekit";

export interface AngleGenerationProgress {
  step: number; // 0 to 4
  total: number; // 4
  currentAngle: string;
  status: "idle" | "analyzing" | "generating" | "uploading" | "completed" | "error";
  error?: string;
  resultsSoFar?: GeneratedAngleResult[];
}

export interface GeneratedAngleResult {
  angleName: string;
  url: string; // ImageKit CDN URL
}

export function getOpenAIApiKey(): string {
  const envKey = (import.meta.env?.VITE_OPENAI_API_KEY as string | undefined)?.trim();
  if (envKey) return envKey;

  try {
    if (typeof process !== "undefined" && process?.env && typeof process.env.OPENAI_API_KEY === "string") {
      const nodeKey = process.env.OPENAI_API_KEY.trim();
      if (nodeKey) return nodeKey;
    }
  } catch {
    // Ignore in pure browser contexts
  }

  if (typeof window !== "undefined") {
    const localKey = localStorage.getItem("pacific_openai_api_key")?.trim();
    if (localKey) return localKey;
  }

  return "";
}

export function setOpenAIApiKey(apiKey: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("pacific_openai_api_key", apiKey.trim());
  }
}

export function isOpenAIConfigured(): boolean {
  return Boolean(getOpenAIApiKey());
}

/**
 * Crop any image source (Data URL or HTTP URL) to exact 4:3 aspect ratio (1200x900)
 */
export async function cropImageTo4x3(imageSrc: string): Promise<Blob> {
  let resolvedUrl = imageSrc;
  let objectUrlToRevoke: string | null = null;

  if (imageSrc.startsWith("http://") || imageSrc.startsWith("https://")) {
    try {
      const resp = await fetch(imageSrc, { mode: "cors" });
      if (resp.ok) {
        const rawBlob = await resp.blob();
        resolvedUrl = URL.createObjectURL(rawBlob);
        objectUrlToRevoke = resolvedUrl;
      }
    } catch (e) {
      console.warn("[cropImageTo4x3] fetch blob warning, trying direct url:", e);
    }
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          fetch(imageSrc).then((r) => r.blob()).then(resolve).catch(reject);
          return;
        }

        const targetAspect = 4 / 3;
        let sWidth = img.width;
        let sHeight = img.height;
        let sx = 0;
        let sy = 0;

        const currentAspect = img.width / img.height;
        if (currentAspect > targetAspect) {
          sWidth = img.height * targetAspect;
          sx = (img.width - sWidth) / 2;
        } else {
          sHeight = img.width / targetAspect;
          sy = (img.height - sHeight) / 2;
        }

        canvas.width = 1200;
        canvas.height = 900; // 4:3 ratio

        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, 1200, 900);
        canvas.toBlob(
          (blob) => {
            if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
            if (blob) resolve(blob);
            else reject(new Error("Failed to process 4:3 canvas blob"));
          },
          "image/webp",
          0.9
        );
      } catch (err) {
        if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
        fetch(imageSrc).then((r) => r.blob()).then(resolve).catch(reject);
      }
    };
    img.onerror = (e) => {
      if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
      reject(new Error("Failed to load source image for 4:3 cropping: " + String(e)));
    };
    img.src = resolvedUrl;
  });
}

export const CAMERA_ANGLES = [
  {
    key: "isometric_wide",
    name: "Wide 45° Isometric Architectural View",
    description: "Wide-angle 45-degree three-quarter isometric architectural view showing the overall cubicle/locker arrangement in a luxury commercial executive washroom. Displays the front facade, top continuous headrail box extrusion, door alignment, and luxury marble/tile surroundings with soft diffused illumination.",
  },
  {
    key: "macro_hardware",
    name: "Macro Hardware Detail Close-Up",
    description: "Eye-level macro close-up photograph focusing on the precision Grade 304 Stainless Steel hardware. Visible components include the self-closing gravity hinge, occupancy indicator lock with red/green indicator dial, ergonomic door pull handle, and coat hook. Crisp metallic reflections and shallow depth of field.",
  },
  {
    key: "interior_ajar",
    name: "Interior Cabin & Door Ajar View",
    description: "Three-quarter perspective photograph taken from the doorway with the cubicle door swung open at a 30-degree angle. Reveals the internal privacy rebated door gap, internal SS coat hook with rubber buffer, and spacious interior cabin depth in a spotless commercial restroom.",
  },
  {
    key: "floor_elevation",
    name: "Low-Angle Structural & Floor Clearance",
    description: "Low-angle architectural elevation photograph shot from finished floor level looking upward. Highlights the adjustable 100mm to 150mm floor supporting legs, floor anchor shoe bracket, mop-clearance gap, and structural stability of the compact laminate panel.",
  },
];

// Curated high-resolution photographic presets for when user has 0 OpenAI balance
export const CURATED_CATEGORY_ANGLES: Record<string, string[]> = {
  Cubicle: [
    "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85",
  ],
  Lockers: [
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=85",
  ],
  "Urinal Partitions": [
    "https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=1200&q=85",
  ],
  "Kids Toilet": [
    "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85",
  ],
};

export interface GenerateModelGalleryOptions {
  mainCoverUrl: string;
  modelTitle: string;
  category: string;
  description?: string;
  onProgress?: (progress: AngleGenerationProgress) => void;
}

/**
 * Generate 4 distinct camera angle photos in 4:3 ratio based on the main cover photo.
 * Uploads all 4 generated images to ImageKit.io and returns their CDN URLs.
 */
export async function generate4GalleryAngles(
  options: GenerateModelGalleryOptions
): Promise<GeneratedAngleResult[]> {
  const { mainCoverUrl, modelTitle, category, description = "", onProgress } = options;
  const apiKey = getOpenAIApiKey();

  if (!apiKey) {
    throw new Error(
      "OpenAI API key not found. Please set VITE_OPENAI_API_KEY in your .env file or enter your key in the settings prompt."
    );
  }

  const openai = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  // Step 1: Analyze Main Cover Photo to extract exact visual style, colors, materials
  onProgress?.({
    step: 0,
    total: 4,
    currentAngle: "Analyzing main cover aesthetic...",
    status: "analyzing",
    resultsSoFar: [],
  });

  let visualAesthetic = "";
  try {
    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are an expert commercial architectural photographer. Analyze this restroom cubicle/locker/urinal partition product photo for "${modelTitle}" (${category}). Describe in 2 concise sentences: 1) The exact board color, texture, and laminate finish, 2) The hardware metal finish (e.g. brushed golden SS, matte black, or brushed silver SS 304), and 3) The architectural environment.`,
            },
            {
              type: "image_url",
              image_url: {
                url: mainCoverUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 150,
    });
    visualAesthetic = analysisResponse.choices[0]?.message?.content?.trim() || "";
  } catch (err: any) {
    console.warn("[OpenAI] Vision analysis skipped, using textual context:", err);
    if (err?.status === 429 || err?.message?.includes("credits")) {
      console.warn("[OpenAI] Quota reached for vision analysis, continuing with architectural descriptors.");
    }
    visualAesthetic = `${category} system with premium solid compact laminate board and heavy-duty stainless steel 304 hardware in a luxury commercial restroom.`;
  }

  const results: GeneratedAngleResult[] = [];

  // Step 2: Sequentially generate each of the 4 angles, crop to 4:3, and upload to ImageKit
  for (let i = 0; i < CAMERA_ANGLES.length; i++) {
    const angle = CAMERA_ANGLES[i];
    onProgress?.({
      step: i + 1,
      total: 4,
      currentAngle: angle.name,
      status: "generating",
      resultsSoFar: [...results],
    });

    const fullPrompt = `${angle.description} Product: "${modelTitle}" (${category}). Visual style & materials: ${visualAesthetic || description}. Ultra-realistic commercial interior architectural photography, clean professional catalog style, neutral balanced studio lighting, sharp focus, 4:3 composition. No humans, no text, no watermarks.`;

    try {
      // Generate image via DALL-E 3 (No response_format parameter to ensure compatibility with all OpenAI accounts)
      const imgResponse = await openai.images.generate({
        model: "dall-e-3",
        prompt: fullPrompt,
        n: 1,
        size: "1024x1024",
      });

      const imgItem = imgResponse.data?.[0];
      const imageSource = imgItem?.url || (imgItem?.b64_json ? `data:image/png;base64,${imgItem.b64_json}` : null);
      if (!imageSource) {
        throw new Error(`OpenAI did not return image data for angle: ${angle.name}`);
      }

      onProgress?.({
        step: i + 1,
        total: 4,
        currentAngle: `Uploading ${angle.name} to ImageKit...`,
        status: "uploading",
        resultsSoFar: [...results],
      });

      // Crop to exact 4:3 ratio via Canvas
      const croppedBlob = await cropImageTo4x3(imageSource);

      // Upload directly to ImageKit.io CDN
      const cleanSlug = modelTitle.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
      const fileName = `${cleanSlug}_angle_${i + 1}_${angle.key}_${Date.now()}.webp`;
      const uploaded = await uploadToImageKit(croppedBlob, fileName, "products");

      results.push({
        angleName: angle.name,
        url: uploaded.url,
      });

      onProgress?.({
        step: i + 1,
        total: 4,
        currentAngle: angle.name,
        status: "generating",
        resultsSoFar: [...results],
      });
    } catch (angleErr: any) {
      console.error(`[OpenAI] Failed to generate angle "${angle.name}":`, angleErr);
      const isQuotaError = angleErr?.status === 429 || angleErr?.message?.includes("credits") || angleErr?.message?.includes("billing");
      if (isQuotaError) {
        throw new Error(
          `OpenAI Credit Balance Exhausted (429): Your OpenAI account has 0 remaining credits. Please add prepaid credits at https://platform.openai.com/settings/organization/billing or switch to a funded API key.`
        );
      }
      throw new Error(`Failed to generate "${angle.name}": ${angleErr.message || angleErr}`);
    }
  }

  onProgress?.({
    step: 4,
    total: 4,
    currentAngle: "Completed 4 gallery angles!",
    status: "completed",
    resultsSoFar: [...results],
  });

  return results;
}

/**
 * Fallback generator using curated architectural perspectives.
 * Crops all 4 angles to exact 4:3 (1200x900) WebP and uploads directly to ImageKit.io CDN.
 * Use when OpenAI API quota is exhausted or for immediate offline simulation.
 */
export async function generateCuratedGalleryAngles(
  options: GenerateModelGalleryOptions
): Promise<GeneratedAngleResult[]> {
  const { modelTitle, category, onProgress } = options;
  const curatedUrls = CURATED_CATEGORY_ANGLES[category] || CURATED_CATEGORY_ANGLES.Cubicle;

  const results: GeneratedAngleResult[] = [];

  for (let i = 0; i < CAMERA_ANGLES.length; i++) {
    const angle = CAMERA_ANGLES[i];
    const sourceUrl = curatedUrls[i % curatedUrls.length];

    onProgress?.({
      step: i + 1,
      total: 4,
      currentAngle: `Processing ${angle.name} in 4:3 WebP...`,
      status: "generating",
      resultsSoFar: [...results],
    });

    try {
      const croppedBlob = await cropImageTo4x3(sourceUrl);

      onProgress?.({
        step: i + 1,
        total: 4,
        currentAngle: `Uploading ${angle.name} to ImageKit CDN...`,
        status: "uploading",
        resultsSoFar: [...results],
      });

      const cleanSlug = modelTitle.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
      const fileName = `${cleanSlug}_curated_${i + 1}_${angle.key}_${Date.now()}.webp`;
      const uploaded = await uploadToImageKit(croppedBlob, fileName, "products");

      results.push({
        angleName: angle.name,
        url: uploaded.url,
      });

      onProgress?.({
        step: i + 1,
        total: 4,
        currentAngle: angle.name,
        status: "generating",
        resultsSoFar: [...results],
      });
    } catch (err: any) {
      console.error(`[Curated Generator] Failed on angle ${angle.name}:`, err);
      throw new Error(`Failed to process "${angle.name}": ${err.message || err}`);
    }
  }

  onProgress?.({
    step: 4,
    total: 4,
    currentAngle: "Completed 4 gallery angles!",
    status: "completed",
    resultsSoFar: [...results],
  });

  return results;
}
