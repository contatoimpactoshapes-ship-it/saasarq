import type { PlanId } from "@/lib/plans";

// ── Credit table — official rate: 1000 credits = R$ 39 ───────────────────────
// Image credits target 40 %+ gross margin at PREMIUM plan (R$ 0.001/credit).
// Formula: credits = AI_cost_usd * 8333  (ensures 40 % margin at PREMIUM).
// Video credits target break-even at PREMIUM; profit at PREMIUM_PLUS.

export const IMAGE_MODELS = [
  {
    id:          "auto",
    name:        "Auto",
    icon:        "✦",
    description: "Melhor modelo para seu prompt",
    credits:     50,                       // R$ 1.95 retail | 70 % margin PREMIUM
    provider:    "fal" as const,
    falId:       "fal-ai/flux/schnell",
  },
  {
    id:          "nano-banana-2",
    name:        "Nano Banana 2",
    icon:        "G",
    description: "Fotorrealismo cinematográfico",
    credits:     200,                      // R$ 7.80 retail | 40 % margin PREMIUM
    provider:    "fal" as const,
    falId:       "fal-ai/flux-realism",
  },
  {
    id:          "nano-banana-pro",
    name:        "Nano Banana Pro",
    icon:        "G",
    description: "Qualidade máxima, detalhes extremos",
    credits:     350,                      // R$ 13.65 retail | 43 % margin PREMIUM
    provider:    "fal" as const,
    falId:       "fal-ai/flux-pro/v1.1",
    premium:     true,
    minPlan:     "PREMIUM" as PlanId,
  },
  {
    id:          "flux2-pro",
    name:        "Flux.2 Pro",
    icon:        "▲",
    description: "Renderização ultra-realista",
    credits:     350,                      // R$ 13.65 retail | 43 % margin PREMIUM
    provider:    "fal" as const,
    falId:       "fal-ai/flux-pro/v1.1",
    minPlan:     "ESSENTIAL" as PlanId,
  },
  {
    id:          "seedream-5-lite",
    name:        "Seedream 5.0 Lite",
    icon:        "◼",
    description: "Estilo artístico equilibrado",
    credits:     180,                      // R$ 7.02 retail | 44 % margin PREMIUM
    provider:    "fal" as const,
    falId:       "fal-ai/seedream-5-lite",
    minPlan:     "ESSENTIAL" as PlanId,
  },
  {
    id:          "recraft-v4-1",
    name:        "Recraft v4.1",
    icon:        "◈",
    description: "Design e ilustração vetorial",
    credits:     200,                      // R$ 7.80 retail | 45 % margin PREMIUM
    provider:    "fal" as const,
    falId:       "fal-ai/recraft-v3",
    minPlan:     "ESSENTIAL" as PlanId,
  },
  {
    id:          "luma-uni-1",
    name:        "Luma Uni 1",
    icon:        "◉",
    description: "Alta coerência visual",
    credits:     250,                      // R$ 9.75 retail | 40 % margin PREMIUM
    provider:    "fal" as const,
    falId:       "fal-ai/luma-photon",
    minPlan:     "ESSENTIAL" as PlanId,
  },
] as const;

// ── Video model definition ────────────────────────────────────────────────────

export interface VideoModelDef {
  id:            string;
  name:          string;
  description:   string;
  credits:       number;
  provider:      "fal" | "openai";
  falId?:        string;
  falIdImg?:     string;
  maxDuration:   number;
  aspectRatios:  string[];
  group:         string;
  badge?:        string;
  /** Minimum plan required to generate with this model */
  minPlan:       PlanId;
  /** True when Sora-style premium tier; shown with special badge */
  soraOnly?:     boolean;
}

export const VIDEO_MODELS: VideoModelDef[] = [
  // ── OpenAI ────────────────────────────────────────────────────────────────
  {
    id:          "sora-2",
    name:        "Sora 2",
    description: "Qualidade cinematográfica máxima · OpenAI",
    credits:     3000,                     // R$ 117 retail | PRO-only
    provider:    "openai",
    maxDuration: 20,
    aspectRatios: ["16:9", "9:16", "1:1"],
    group:       "OpenAI",
    badge:       "PRO",
    minPlan:     "PRO",
    soraOnly:    true,
  },
  // ── Kuaishou ──────────────────────────────────────────────────────────────
  {
    id:          "kling-2.1-pro",
    name:        "Kling 2.1 Pro",
    description: "Realismo excepcional · Kuaishou",
    credits:     1200,                     // R$ 46.80 retail | PREMIUM_PLUS+
    provider:    "fal",
    falId:       "fal-ai/kling-video/v2.1/pro/text-to-video",
    falIdImg:    "fal-ai/kling-video/v2.1/pro/image-to-video",
    maxDuration: 10,
    aspectRatios: ["16:9", "9:16", "1:1", "4:3"],
    group:       "Kuaishou",
    badge:       "Premium+",
    minPlan:     "PREMIUM_PLUS",
  },
  // ── Runway ────────────────────────────────────────────────────────────────
  {
    id:          "runway-gen3",
    name:        "Runway Gen-3 Alpha",
    description: "Profissional e rápido · Runway",
    credits:     1000,                     // R$ 39 retail | PREMIUM+
    provider:    "fal",
    falId:       "fal-ai/runway-gen3/turbo/text-to-video",
    falIdImg:    "fal-ai/runway-gen3/turbo/image-to-video",
    maxDuration: 10,
    aspectRatios: ["16:9", "9:16", "1:1"],
    group:       "Runway",
    minPlan:     "PREMIUM",
  },
  // ── Luma ──────────────────────────────────────────────────────────────────
  {
    id:          "luma-ray2",
    name:        "Luma Dream Machine",
    description: "Cinematográfico natural · Luma AI",
    credits:     900,                      // R$ 35.10 retail | PREMIUM+
    provider:    "fal",
    falId:       "fal-ai/luma-dream-machine/text-to-video",
    falIdImg:    "fal-ai/luma-dream-machine/image-to-video",
    maxDuration: 10,
    aspectRatios: ["16:9", "9:16", "3:4", "4:3", "21:9", "9:21"],
    group:       "Luma",
    minPlan:     "PREMIUM",
  },
  // ── MiniMax ───────────────────────────────────────────────────────────────
  {
    id:          "minimax-hailuo",
    name:        "MiniMax Hailuo",
    description: "Fluido e detalhado · MiniMax",
    credits:     700,                      // R$ 27.30 retail | PREMIUM+
    provider:    "fal",
    falId:       "fal-ai/minimax/video-01",
    falIdImg:    "fal-ai/minimax/video-01",
    maxDuration: 6,
    aspectRatios: ["16:9", "9:16", "1:1"],
    group:       "MiniMax",
    minPlan:     "PREMIUM",
  },
  // ── Tencent ───────────────────────────────────────────────────────────────
  {
    id:          "hunyuan",
    name:        "HunyuanVideo",
    description: "Open source avançado · Tencent",
    credits:     600,                      // R$ 23.40 retail | ESSENTIAL+
    provider:    "fal",
    falId:       "fal-ai/hunyuan-video",
    falIdImg:    "fal-ai/hunyuan-video/image-to-video",
    maxDuration: 10,
    aspectRatios: ["16:9", "9:16", "1:1"],
    group:       "Tencent",
    minPlan:     "ESSENTIAL",
  },
  // ── Legacy (kept for backward compat) ─────────────────────────────────────
  {
    id: "kling-2.5", name: "Kling 2.5", description: "Kuaishou · Standard",
    credits: 1500, provider: "fal",
    falId: "fal-ai/kling-video/v2.5/standard",
    maxDuration: 10, aspectRatios: ["16:9", "9:16", "1:1"], group: "Kuaishou",
    minPlan: "PREMIUM_PLUS",
  },
  {
    id: "seedance-2.0", name: "Seedance 2.0", description: "Fluido",
    credits: 1200, provider: "fal",
    maxDuration: 8, aspectRatios: ["16:9", "9:16"], group: "Legacy",
    minPlan: "PREMIUM",
  },
  {
    id: "happy-horse-1", name: "Happy Horse 1", description: "Com áudio",
    credits: 1000, provider: "fal",
    maxDuration: 5, aspectRatios: ["16:9", "9:16", "1:1"], group: "Legacy",
    minPlan: "PREMIUM",
  },
];

export const ASPECT_RATIOS = [
  { value: "1:1",    label: "1:1",   width: 1024, height: 1024 },
  { value: "16:9",   label: "16:9",  width: 1280, height: 720 },
  { value: "9:16",   label: "9:16",  width: 720,  height: 1280 },
  { value: "4:3",    label: "4:3",   width: 1024, height: 768 },
  { value: "3:4",    label: "3:4",   width: 768,  height: 1024 },
  { value: "21:9",   label: "21:9",  width: 1280, height: 548 },
] as const;

export const CREDIT_COSTS = {
  "image:auto:1x":          50,
  "image:nano-banana-2:1x": 200,
  "image:flux2-pro:1x":     350,
  "video:kling-2.1-pro:5s": 1200,
  "video:luma-ray2:5s":     900,
  "tts:standard:1min":      200,
  "music:1track":           500,
  "sfx:1clip":              50,
  "3d:image-to-3d":         300,
} as const;

export type ImageModelId = typeof IMAGE_MODELS[number]["id"];
export type VideoModelId = string;

export function getImageModel(id: string) {
  return IMAGE_MODELS.find((m) => m.id === id);
}

export function getVideoModel(id: string): VideoModelDef | undefined {
  return VIDEO_MODELS.find((m) => m.id === id);
}
