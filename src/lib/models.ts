export const IMAGE_MODELS = [
  {
    id: "auto",
    name: "Auto",
    icon: "✦",
    description: "Melhor modelo para seu prompt",
    credits: 50,
    provider: "fal" as const,
    falId: "fal-ai/flux/schnell",
  },
  {
    id: "nano-banana-2",
    name: "Nano Banana 2",
    icon: "G",
    description: "Fotorrealismo cinematográfico",
    credits: 80,
    provider: "fal" as const,
    falId: "fal-ai/flux-realism",
  },
  {
    id: "nano-banana-pro",
    name: "Nano Banana Pro",
    icon: "G",
    description: "Qualidade máxima, detalhes extremos",
    credits: 150,
    provider: "fal" as const,
    falId: "fal-ai/flux-pro/v1.1",
    premium: true,
  },
  {
    id: "flux2-pro",
    name: "Flux.2 Pro",
    icon: "▲",
    description: "Renderização ultra-realista",
    credits: 120,
    provider: "fal" as const,
    falId: "fal-ai/flux-pro/v1.1",
  },
  {
    id: "seedream-5-lite",
    name: "Seedream 5.0 Lite",
    icon: "◼",
    description: "Estilo artístico equilibrado",
    credits: 90,
    provider: "fal" as const,
    falId: "fal-ai/seedream-5-lite",
  },
  {
    id: "recraft-v4-1",
    name: "Recraft v4.1",
    icon: "◈",
    description: "Design e ilustração vetorial",
    credits: 100,
    provider: "fal" as const,
    falId: "fal-ai/recraft-v3",
  },
  {
    id: "luma-uni-1",
    name: "Luma Uni 1",
    icon: "◉",
    description: "Alta coerência visual",
    credits: 110,
    provider: "fal" as const,
    falId: "fal-ai/luma-photon",
  },
] as const;

// ── Video model definition ─────────────────────────────────────────────────────
export interface VideoModelDef {
  id: string;
  name: string;
  description: string;
  credits: number;
  provider: "fal" | "openai";
  /** FAL text-to-video endpoint */
  falId?: string;
  /** FAL image-to-video endpoint (if different from falId) */
  falIdImg?: string;
  maxDuration: number;
  aspectRatios: string[];
  group: string;
  badge?: string;
}

export const VIDEO_MODELS: VideoModelDef[] = [
  // ── OpenAI ────────────────────────────────────────────────────────────────
  {
    id: "sora-2",
    name: "Sora 2",
    description: "Qualidade cinematográfica máxima · OpenAI",
    credits: 800,
    provider: "openai",
    maxDuration: 20,
    aspectRatios: ["16:9", "9:16", "1:1"],
    group: "OpenAI",
    badge: "Premium",
  },
  // ── Kuaishou ──────────────────────────────────────────────────────────────
  {
    id: "kling-2.1-pro",
    name: "Kling 2.1 Pro",
    description: "Realismo excepcional · Kuaishou",
    credits: 500,
    provider: "fal",
    falId:    "fal-ai/kling-video/v2.1/pro/text-to-video",
    falIdImg: "fal-ai/kling-video/v2.1/pro/image-to-video",
    maxDuration: 10,
    aspectRatios: ["16:9", "9:16", "1:1", "4:3"],
    group: "Kuaishou",
    badge: "Novo",
  },
  // ── Runway ────────────────────────────────────────────────────────────────
  {
    id: "runway-gen3",
    name: "Runway Gen-3 Alpha",
    description: "Profissional e rápido · Runway",
    credits: 420,
    provider: "fal",
    falId:    "fal-ai/runway-gen3/turbo/text-to-video",
    falIdImg: "fal-ai/runway-gen3/turbo/image-to-video",
    maxDuration: 10,
    aspectRatios: ["16:9", "9:16", "1:1"],
    group: "Runway",
  },
  // ── Luma ──────────────────────────────────────────────────────────────────
  {
    id: "luma-ray2",
    name: "Luma Dream Machine",
    description: "Cinematográfico natural · Luma AI",
    credits: 380,
    provider: "fal",
    falId:    "fal-ai/luma-dream-machine/text-to-video",
    falIdImg: "fal-ai/luma-dream-machine/image-to-video",
    maxDuration: 10,
    aspectRatios: ["16:9", "9:16", "3:4", "4:3", "21:9", "9:21"],
    group: "Luma",
  },
  // ── MiniMax ───────────────────────────────────────────────────────────────
  {
    id: "minimax-hailuo",
    name: "MiniMax Hailuo",
    description: "Fluido e detalhado · MiniMax",
    credits: 320,
    provider: "fal",
    falId:    "fal-ai/minimax/video-01",
    falIdImg: "fal-ai/minimax/video-01",
    maxDuration: 6,
    aspectRatios: ["16:9", "9:16", "1:1"],
    group: "MiniMax",
  },
  // ── Tencent ───────────────────────────────────────────────────────────────
  {
    id: "hunyuan",
    name: "HunyuanVideo",
    description: "Open source avançado · Tencent",
    credits: 260,
    provider: "fal",
    falId:    "fal-ai/hunyuan-video",
    falIdImg: "fal-ai/hunyuan-video/image-to-video",
    maxDuration: 10,
    aspectRatios: ["16:9", "9:16", "1:1"],
    group: "Tencent",
  },
  // ── Legacy (kept for backward compat) ─────────────────────────────────────
  { id: "kling-2.5",     name: "Kling 2.5",         description: "Kuaishou · Standard", credits: 800,  provider: "fal", falId: "fal-ai/kling-video/v2.5/standard", maxDuration: 10, aspectRatios: ["16:9", "9:16", "1:1"], group: "Kuaishou" },
  { id: "seedance-2.0",  name: "Seedance 2.0",       description: "Fluido",             credits: 1126, provider: "fal", maxDuration: 8, aspectRatios: ["16:9", "9:16"], group: "Legacy" },
  { id: "happy-horse-1", name: "Happy Horse 1",       description: "Com áudio",          credits: 900,  provider: "fal", maxDuration: 5, aspectRatios: ["16:9", "9:16", "1:1"], group: "Legacy" },
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
  "image:nano-banana-2:1x": 80,
  "image:flux2-pro:1x":     120,
  "video:kling-3.0-4k:3s":  1200,
  "video:seedance-2.0:4s":  1126,
  "tts:standard:1min":      100,
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
