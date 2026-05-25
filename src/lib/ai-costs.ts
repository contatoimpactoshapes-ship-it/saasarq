/**
 * Estimated USD cost per generation, keyed by FAL model endpoint.
 * Values are approximations based on publicly listed FAL.ai pricing.
 * Used for cost analytics only — not charged to users.
 */

export const USD_BRL_RATE = 5.0;

// Cost in USD per generation (per image or per clip)
export const MODEL_COST_USD: Record<string, number> = {
  // Flux image models
  "fal-ai/flux/schnell":                  0.003,
  "fal-ai/flux/dev":                      0.025,
  "fal-ai/flux-realism":                  0.025,
  "fal-ai/flux-pro/v1.1":                0.04,
  "fal-ai/flux-pro/v1/redux":            0.05,
  "fal-ai/flux-kontext/dev":              0.025,
  "fal-ai/flux-pro/kontext":              0.05,
  "fal-ai/flux/dev/image-to-image":      0.025,
  "fal-ai/flux-pro/v1/fill":             0.04,
  // Other image models
  "fal-ai/seedream-5-lite":              0.02,
  "fal-ai/recraft-v3":                   0.022,
  "fal-ai/luma-photon":                  0.03,
  "fal-ai/nano-banana/edit":             0.05,
  "fal-ai/nano-banana-2/edit":           0.05,
  "fal-ai/nano-banana-pro/edit":         0.08,
  "fal-ai/ideogram/v2/remix":            0.08,
  "fal-ai/ideogram/v3/edit":             0.09,
  "fal-ai/qwen-image-2/pro/edit":        0.04,
  "fal-ai/stable-diffusion-xl/image-to-image": 0.01,
  // Video models
  "fal-ai/kling-video/v2.1/pro/text-to-video":  0.14,
  "fal-ai/kling-video/v2.1/pro/image-to-video": 0.14,
  "fal-ai/kling-video/v2.5/standard":           0.10,
  "fal-ai/runway-gen3/turbo/text-to-video":      0.12,
  "fal-ai/runway-gen3/turbo/image-to-video":     0.12,
  "fal-ai/luma-dream-machine/text-to-video":     0.10,
  "fal-ai/luma-dream-machine/image-to-video":    0.10,
  "fal-ai/minimax/video-01":                     0.08,
  "fal-ai/hunyuan-video":                        0.07,
  "fal-ai/hunyuan-video/image-to-video":         0.07,
  // OpenAI (via proxy — estimated)
  "openai/gpt-image-2/edit":                     0.04,
};

// Default fallback cost when model is not in table
const DEFAULT_COST_USD = 0.025;

export type ToolType = "IMAGE_GENERATE" | "RENDER" | "VIDEO_GENERATE" | "TTS" | "INPAINT";
export type ProviderName = "fal" | "openai" | "unknown";

export function getProvider(falModelId: string): ProviderName {
  if (falModelId.startsWith("openai/")) return "openai";
  if (falModelId.startsWith("fal-ai/")) return "fal";
  return "unknown";
}

export function estimateCostUSD(falModelId: string | null | undefined): number {
  if (!falModelId) return DEFAULT_COST_USD;
  return MODEL_COST_USD[falModelId] ?? DEFAULT_COST_USD;
}
