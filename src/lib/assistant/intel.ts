// Pure client-side text extraction utilities for Prompt Architect Intelligence Studio
// All functions parse the generated prompt text — no API calls, no state, no side effects.

export type StyleResult  = { label: string; confidence: number };
export type CameraResult = { focalLength: string; height: string; type: string };
export type ScoreLevel   = { label: string; description: string; tier: "excellent" | "strong" | "good" | "limited" };

// ── Style detection ───────────────────────────────────────────────────────────

const STYLE_KEYWORDS: Array<{ patterns: RegExp[]; label: string }> = [
  { patterns: [/minimali[sz]/i, /\bminimal\b/i],                         label: "Minimalist" },
  { patterns: [/contemporary/i, /\bmodern\b/i],                          label: "Contemporary" },
  { patterns: [/industrial/i, /exposed (concrete|brick|steel)/i],        label: "Industrial" },
  { patterns: [/biophilic/i, /organic material/i],                       label: "Biophilic" },
  { patterns: [/\bclassic/i, /neoclassic/i],                             label: "Classical" },
  { patterns: [/brutali/i],                                               label: "Brutalist" },
  { patterns: [/scandinavian/i, /nordic/i],                              label: "Scandinavian" },
  { patterns: [/mediterranean/i],                                         label: "Mediterranean" },
  { patterns: [/wabi.?sabi/i, /japandi/i, /\bjapanese\b/i],             label: "Japanese / Wabi-Sabi" },
  { patterns: [/bohemian/i, /\bboho\b/i, /eclectic/i],                  label: "Eclectic" },
  { patterns: [/art\s?deco/i],                                            label: "Art Deco" },
  { patterns: [/tropical/i, /coastal/i],                                  label: "Tropical / Coastal" },
];

export function detectStyle(text: string): StyleResult {
  let bestLabel   = "Contemporary";
  let bestMatches = 0;

  for (const { patterns, label } of STYLE_KEYWORDS) {
    const matches = patterns.filter((p) => p.test(text)).length;
    if (matches > bestMatches) {
      bestMatches = matches;
      bestLabel   = label;
    }
  }

  const confidence = bestMatches === 0 ? 0 : Math.min(100, bestMatches * 45 + 30);
  return { label: bestLabel, confidence };
}

// ── Material detection ────────────────────────────────────────────────────────

const MATERIAL_KEYWORDS: Array<{ patterns: RegExp[]; label: string }> = [
  { patterns: [/\boak\b/i, /\bwalnut\b/i, /\bteak\b/i, /\btimber\b/i, /\bwood/i, /\bbamboo/i], label: "Wood" },
  { patterns: [/\bmarble\b/i, /\bgranite\b/i, /\blimestone\b/i, /\btravertine\b/i],             label: "Marble / Stone" },
  { patterns: [/\bconcrete\b/i, /\bcement\b/i],                                                 label: "Concrete" },
  { patterns: [/\bglass\b/i, /\bglazed\b/i],                                                    label: "Glass" },
  { patterns: [/\bsteel\b/i, /\bmetal\b/i, /\biron\b/i, /\bcopper\b/i, /\bbrass\b/i, /\bbronze\b/i], label: "Metal" },
  { patterns: [/\blinen\b/i, /\bvelvet\b/i, /\bleather\b/i, /\btextile\b/i, /\bfabric\b/i],   label: "Textiles" },
  { patterns: [/\bceramic\b/i, /\bporcelain\b/i, /\btile\b/i],                                 label: "Ceramics" },
  { patterns: [/\bbrick\b/i],                                                                    label: "Brick" },
  { patterns: [/\bterracotta\b/i, /\bclay\b/i],                                                 label: "Terracotta" },
  { patterns: [/\brattan\b/i, /\bwicker\b/i],                                                   label: "Rattan" },
  { patterns: [/\bplaster\b/i, /\bstucco\b/i],                                                  label: "Plaster" },
  { patterns: [/\bstone\b/i],                                                                    label: "Stone" },
];

export function detectMaterials(text: string): string[] {
  const found: string[] = [];
  for (const { patterns, label } of MATERIAL_KEYWORDS) {
    if (patterns.some((p) => p.test(text))) found.push(label);
    if (found.length >= 6) break;
  }
  return found;
}

// ── Lighting detection ────────────────────────────────────────────────────────

const LIGHTING_KEYWORDS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /golden.?hour/i,                    label: "Golden hour · warm natural light" },
  { pattern: /diffused?.?(daylight|light)/i,     label: "Diffused ambient daylight" },
  { pattern: /natural.?(daylight|light)/i,       label: "Soft natural daylight" },
  { pattern: /dramatic.?light/i,                 label: "Dramatic directional lighting" },
  { pattern: /warm.?ambient/i,                   label: "Warm ambient artificial light" },
  { pattern: /soft.?light/i,                     label: "Soft diffused illumination" },
  { pattern: /recessed.*(ceiling|lighting)/i,    label: "Recessed ceiling lighting" },
  { pattern: /pendant.?light/i,                  label: "Pendant accent lighting" },
  { pattern: /sunbeam|sunlight/i,                label: "Direct sunlight with cast shadows" },
  { pattern: /night.?light|evening.?light/i,     label: "Evening / night ambiance" },
  { pattern: /\bray.?trac/i,                     label: "Ray-traced global illumination" },
  { pattern: /hdr|high.?dynamic.?range/i,        label: "HDR high-dynamic range" },
  { pattern: /zenital|zenithal/i,                label: "Zenithal / skylighted" },
];

export function detectLighting(text: string): string {
  for (const { pattern, label } of LIGHTING_KEYWORDS) {
    if (pattern.test(text)) return label;
  }
  return "Natural ambient lighting";
}

// ── Camera detection ──────────────────────────────────────────────────────────

const FOCAL_KEYWORDS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\b16mm\b/i,  label: "16mm ultra-wide" },
  { pattern: /\b24mm\b/i,  label: "24mm wide" },
  { pattern: /\b28mm\b/i,  label: "28mm wide" },
  { pattern: /\b35mm\b/i,  label: "35mm standard" },
  { pattern: /\b50mm\b/i,  label: "50mm prime" },
  { pattern: /\b85mm\b/i,  label: "85mm portrait" },
  { pattern: /\b135mm\b/i, label: "135mm telephoto" },
];

const HEIGHT_KEYWORDS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /eye.?level/i,         label: "Eye level" },
  { pattern: /aerial|bird.?s.?eye/i, label: "Aerial / bird's-eye" },
  { pattern: /low.?angle|low.?shot/i, label: "Low angle" },
  { pattern: /high.?angle/i,        label: "High angle" },
  { pattern: /overhead/i,           label: "Overhead" },
];

const LENS_TYPE_KEYWORDS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /wide.?angle/i,  label: "Wide-angle" },
  { pattern: /telephoto/i,    label: "Telephoto" },
  { pattern: /prime.?lens/i,  label: "Prime" },
  { pattern: /macro/i,        label: "Macro" },
];

export function detectCamera(text: string): CameraResult {
  let focalLength = "Standard";
  for (const { pattern, label } of FOCAL_KEYWORDS) {
    if (pattern.test(text)) { focalLength = label; break; }
  }

  let height = "Eye level";
  for (const { pattern, label } of HEIGHT_KEYWORDS) {
    if (pattern.test(text)) { height = label; break; }
  }

  let type = "Full-frame";
  if (/wide.?angle/i.test(text) || /\b(16|24|28)mm\b/i.test(text)) type = "Wide-angle";
  else {
    for (const { pattern, label } of LENS_TYPE_KEYWORDS) {
      if (pattern.test(text)) { type = label; break; }
    }
  }

  return { focalLength, height, type };
}

// ── Score level ───────────────────────────────────────────────────────────────

export function getScoreLevel(score: number): ScoreLevel {
  if (score >= 90) return {
    label:       "Excellent",
    description: "Production-ready prompt with precise material, lighting, and composition descriptors.",
    tier:        "excellent",
  };
  if (score >= 80) return {
    label:       "Strong",
    description: "High-quality prompt. Minor refinements could further enhance photorealism.",
    tier:        "strong",
  };
  if (score >= 70) return {
    label:       "Good",
    description: "Solid foundation. Adding material properties and lighting specifics will improve results.",
    tier:        "good",
  };
  return {
    label:       "Needs Improvement",
    description: "Add physical material properties, light direction, and camera settings for better output.",
    tier:        "limited",
  };
}
