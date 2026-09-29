/**
 * NVIDIA NIM Multi-Angle Gallery Generation Service
 * Model: qwen-image-edit-nvpcb-ovsl2sl
 * Endpoint: https://integrate.api.nvidia.com/v1/images/edits (OpenAI-compatible)
 *
 * Takes the uploaded cover photo and generates 4 architectural camera-angle
 * variations in 4:3 ratio (1200×900 WebP), uploading each directly to
 * ImageKit.io CDN and returning the public CDN URLs.
 */
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

// ─── API Key helpers (reads VITE_NVIDIA_API_KEY or NVIDIA_API_KEY) ────────────

export function getNvidiaApiKey(): string {
  const envKey = (import.meta.env?.VITE_NVIDIA_API_KEY as string | undefined)?.trim();
  if (envKey) return envKey;

  try {
    if (typeof process !== "undefined" && process?.env && typeof process.env.NVIDIA_API_KEY === "string") {
      const nodeKey = process.env.NVIDIA_API_KEY.trim();
      if (nodeKey) return nodeKey;
    }
  } catch {
    // Ignore in pure browser contexts
  }

  if (typeof window !== "undefined") {
    const localKey = localStorage.getItem("pacific_nvidia_api_key")?.trim();
    if (localKey) return localKey;
  }

  return "";
}

export function setNvidiaApiKey(apiKey: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("pacific_nvidia_api_key", apiKey.trim());
  }
}

export function isNvidiaConfigured(): boolean {
  return Boolean(getNvidiaApiKey());
}

// ─── Backwards-compatible aliases used by OpenAIGalleryModal ────────────────
export const getOpenAIApiKey = getNvidiaApiKey;
export const setOpenAIApiKey = setNvidiaApiKey;
export const isOpenAIConfigured = isNvidiaConfigured;

// ─── Image helpers ────────────────────────────────────────────────────────────

/** Convert a remote URL or data-URI to a base64 data-URI string */
async function toBase64DataUri(imageSrc: string): Promise<string> {
  if (imageSrc.startsWith("data:")) return imageSrc;

  const resp = await fetch(imageSrc, { mode: "cors" });
  if (!resp.ok) throw new Error(`Failed to fetch image: ${resp.status}`);
  const blob = await resp.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Crop any image source (Data URL or HTTP URL) to exact 4:3 aspect ratio (1200x900) WebP */
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

// ─── Camera angle definitions ─────────────────────────────────────────────────

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

// ─── Curated fallback angles ──────────────────────────────────────────────────

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

// ─── NVIDIA NIM image edit call ───────────────────────────────────────────────

const NVIDIA_NIM_ENDPOINT = "https://integrate.api.nvidia.com/v1/images/edits";
const NVIDIA_MODEL = "qwen-image-edit-nvpcb-ovsl2sl";

/**
 * Call NVIDIA NIM qwen-image-edit with a base64 image and a text prompt.
 * Returns a base64 data-URI for the generated image.
 */
async function callNvidiaImageEdit(
  apiKey: string,
  imageDataUri: string,
  prompt: string
): Promise<string> {
  const body = {
    model: NVIDIA_MODEL,
    prompt,
    image: imageDataUri,
    n: 1,
    response_format: "b64_json",
  };

  const res = await fetch(NVIDIA_NIM_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    const isQuota =
      res.status === 429 || errText.includes("quota") || errText.includes("rate") || errText.includes("credit");
    if (isQuota) {
      throw new Error(
        `NVIDIA NIM Credit Exhausted (429): Your API quota has been reached. ` +
          `Add credits at https://build.nvidia.com/ or switch to a new API key. ` +
          `Alternatively use the Curated 4:3 Angles backup generator.`
      );
    }
    throw new Error(`NVIDIA NIM request failed [${res.status}]: ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json as string | undefined;
  if (!b64) {
    throw new Error("NVIDIA NIM returned no image data in response.");
  }

  return `data:image/png;base64,${b64}`;
}

// ─── Main generator ───────────────────────────────────────────────────────────

/**
 * Generate 4 distinct camera-angle photos in 4:3 ratio by calling the
 * NVIDIA NIM qwen-image-edit model with the cover photo as the reference
 * image. Crops to 1200×900 WebP and uploads each to ImageKit.io CDN.
 */
export async function generate4GalleryAngles(
  options: GenerateModelGalleryOptions
): Promise<GeneratedAngleResult[]> {
  const { mainCoverUrl, modelTitle, category, description = "", onProgress } = options;
  const apiKey = getNvidiaApiKey();

  if (!apiKey) {
    throw new Error(
      "NVIDIA API key not found. Please set VITE_NVIDIA_API_KEY in your .env file or enter your key in the settings."
    );
  }

  // Convert cover photo to base64 so the model can use it as reference
  onProgress?.({
    step: 0,
    total: 4,
    currentAngle: "Preparing cover photo for NVIDIA NIM...",
    status: "analyzing",
    resultsSoFar: [],
  });

  let coverBase64: string;
  try {
    coverBase64 = await toBase64DataUri(mainCoverUrl);
  } catch (err) {
    console.warn("[NVIDIA NIM] Could not fetch cover image, using placeholder.");
    coverBase64 =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  }

  const results: GeneratedAngleResult[] = [];

  for (let i = 0; i < CAMERA_ANGLES.length; i++) {
    const angle = CAMERA_ANGLES[i];

    onProgress?.({
      step: i + 1,
      total: 4,
      currentAngle: angle.name,
      status: "generating",
      resultsSoFar: [...results],
    });

    const fullPrompt =
      `${angle.description} ` +
      `Product: "${modelTitle}" (${category}). ` +
      `${description ? `Style: ${description}. ` : ""}` +
      `Ultra-realistic commercial interior architectural photography, ` +
      `clean professional catalog style, neutral balanced studio lighting, ` +
      `sharp focus, 4:3 composition. No humans, no text, no watermarks.`;

    let imageSource: string;

    try {
      imageSource = await callNvidiaImageEdit(apiKey, coverBase64, fullPrompt);
    } catch (err: any) {
      if (err.message?.includes("429") || err.message?.includes("quota") || err.message?.includes("Credit")) {
        throw err; // propagate quota errors immediately
      }
      // Non-quota errors: log and fall back to curated angle
      console.warn(`[NVIDIA NIM] Angle "${angle.name}" failed, using curated fallback:`, err.message);
      const curatedUrls = CURATED_CATEGORY_ANGLES[category] || CURATED_CATEGORY_ANGLES.Cubicle;
      imageSource = curatedUrls[i % curatedUrls.length];
    }

    onProgress?.({
      step: i + 1,
      total: 4,
      currentAngle: `Uploading ${angle.name} to ImageKit...`,
      status: "uploading",
      resultsSoFar: [...results],
    });

    const croppedBlob = await cropImageTo4x3(imageSource);
    const cleanSlug = modelTitle.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    const fileName = `${cleanSlug}_angle_${i + 1}_${angle.key}_${Date.now()}.webp`;
    const uploaded = await uploadToImageKit(croppedBlob, fileName, "products");

    results.push({ angleName: angle.name, url: uploaded.url });

    onProgress?.({
      step: i + 1,
      total: 4,
      currentAngle: angle.name,
      status: "generating",
      resultsSoFar: [...results],
    });
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

// ─── Curated fallback generator ───────────────────────────────────────────────

/**
 * Fallback generator using curated architectural photos.
 * Crops to exact 4:3 (1200×900) WebP and uploads to ImageKit.io CDN.
 * Use when NVIDIA API quota is exhausted or for immediate demo testing.
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

      results.push({ angleName: angle.name, url: uploaded.url });

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
