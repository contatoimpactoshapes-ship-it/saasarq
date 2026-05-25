/**
 * Unified model lookup across image, video, and audio models.
 * Returns the FAL model endpoint ID for any model by its internal ID.
 */
import { IMAGE_MODELS, VIDEO_MODELS } from "@/lib/models";
import { AI_MODELS } from "@/lib/config";

// Static overrides for special-purpose models not in the model lists
const STATIC_MODEL_MAP: Record<string, string> = {
  // Legacy
  "render-3d":               "fal-ai/flux/dev/image-to-image",
  // Flux
  "render-flux-dev":         "fal-ai/flux/dev/image-to-image",
  "render-flux-pro":         "fal-ai/flux-pro/v1/redux",
  "render-flux-kontext-dev": "fal-ai/flux-kontext/dev",
  "render-flux-kontext-pro": "fal-ai/flux-pro/kontext",
  // Google Nano Banana
  "render-nano-banana":      "fal-ai/nano-banana/edit",
  "render-nano-banana-2":    "fal-ai/nano-banana-2/edit",
  "render-nano-banana-pro":  "fal-ai/nano-banana-pro/edit",
  // Ideogram
  "render-ideogram":         "fal-ai/ideogram/v2/remix",
  "render-ideogram-v3":      "fal-ai/ideogram/v3/edit",
  // Qwen / Alibaba
  "render-qwen-pro":         "fal-ai/qwen-image-2/pro/edit",
  // OpenAI
  "render-gpt-image-2":      "openai/gpt-image-2/edit",
  // SDXL
  "render-sdxl":             "fal-ai/stable-diffusion-xl/image-to-image",
  // Inpainting
  "inpaint-flux-fill":       "fal-ai/flux-pro/v1/fill",
};

export function getFalModelId(modelId: string): string | undefined {
  // Static overrides first (e.g. render-3d, img2img workflows)
  if (STATIC_MODEL_MAP[modelId]) return STATIC_MODEL_MAP[modelId];

  // Check new image models first
  const imageModel = IMAGE_MODELS.find((m) => m.id === modelId);
  if (imageModel && "falId" in imageModel) return imageModel.falId;

  // Check new video models — prefer text-to-video falId
  const videoModel = VIDEO_MODELS.find((m) => m.id === modelId);
  if (videoModel?.falId) return videoModel.falId;

  // Fall back to old config (legacy)
  const legacyModel = AI_MODELS.find((m) => m.id === modelId);
  if (legacyModel) return legacyModel.falModel;

  return undefined;
}

/** Returns the image-to-video FAL endpoint for the given video model */
export function getFalVideoImgModelId(modelId: string): string | undefined {
  const videoModel = VIDEO_MODELS.find((m) => m.id === modelId);
  if (videoModel?.falIdImg) return videoModel.falIdImg;
  return getFalModelId(modelId); // fallback to text endpoint
}

export function getModelDisplayName(modelId: string): string {
  const imageModel = IMAGE_MODELS.find((m) => m.id === modelId);
  if (imageModel) return imageModel.name;

  const videoModel = VIDEO_MODELS.find((m) => m.id === modelId);
  if (videoModel) return videoModel.name;

  const legacyModel = AI_MODELS.find((m) => m.id === modelId);
  if (legacyModel) return legacyModel.name;

  return modelId;
}
