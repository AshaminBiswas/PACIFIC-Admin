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
            if (blob) resolve(blob);
            else reject(new Error("Failed to process 4:3 canvas blob"));
          },
          "image/webp",
          0.9
        );
      } catch (err) {
        fetch(imageSrc).then((r) => r.blob()).then(resolve).catch(reject);
      }
    };
    img.onerror = (e) => reject(new Error("Failed to load source image for 4:3 cropping: " + String(e)));
    img.src = imageSrc;
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
  } catch (err) {
    console.warn("[OpenAI] Vision analysis skipped, using textual context:", err);
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
      // Generate image via DALL-E 3
      const imgResponse = await openai.images.generate({
        model: "dall-e-3",
        prompt: fullPrompt,
        n: 1,
        size: "1024x1024",
        response_format: "b64_json",
      });

      const b64Json = imgResponse.data?.[0]?.b64_json;
      if (!b64Json) {
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
      const rawDataUrl = `data:image/png;base64,${b64Json}`;
      const croppedBlob = await cropImageTo4x3(rawDataUrl);

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
