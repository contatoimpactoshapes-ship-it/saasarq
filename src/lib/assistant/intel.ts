// Pure client-side text extraction utilities for Prompt Architect Intelligence Studio
// All functions parse the generated prompt text — no API calls, no state, no side effects.

export type StyleResult  = { label: string; confidence: number };
export type CameraResult = { focalLength: string; height: string; type: string };
export type ScoreLevel   = { label: string; description: string; tier: "excellent" | "strong" | "good" | "limited" };

// ── Style detection ───────────────────────────────────────────────────────────

const STYLE_KEYWORDS: Array<{ patterns: RegExp[]; label: string }> = [
  { patterns: [/minimali[sz]/i, /\bminimal\b/i],                         label: "Minimalista" },
  { patterns: [/contemporary/i, /\bmodern\b/i],                          label: "Contemporâneo" },
  { patterns: [/industrial/i, /exposed (concrete|brick|steel)/i],        label: "Industrial" },
  { patterns: [/biophilic/i, /organic material/i],                       label: "Biofílico" },
  { patterns: [/\bclassic/i, /neoclassic/i],                             label: "Clássico" },
  { patterns: [/brutali/i],                                               label: "Brutalista" },
  { patterns: [/scandinavian/i, /nordic/i],                              label: "Escandinavo" },
  { patterns: [/mediterranean/i],                                         label: "Mediterrâneo" },
  { patterns: [/wabi.?sabi/i, /japandi/i, /\bjapanese\b/i],             label: "Japonês / Wabi-Sabi" },
  { patterns: [/bohemian/i, /\bboho\b/i, /eclectic/i],                  label: "Eclético" },
  { patterns: [/art\s?deco/i],                                            label: "Art Déco" },
  { patterns: [/tropical/i, /coastal/i],                                  label: "Tropical / Costeiro" },
];

export function detectStyle(text: string): StyleResult {
  let bestLabel   = "Contemporâneo";
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
  { patterns: [/\boak\b/i, /\bwalnut\b/i, /\bteak\b/i, /\btimber\b/i, /\bwood/i, /\bbamboo/i], label: "Madeira" },
  { patterns: [/\bmarble\b/i, /\bgranite\b/i, /\blimestone\b/i, /\btravertine\b/i],             label: "Mármore / Pedra" },
  { patterns: [/\bconcrete\b/i, /\bcement\b/i],                                                 label: "Concreto" },
  { patterns: [/\bglass\b/i, /\bglazed\b/i],                                                    label: "Vidro" },
  { patterns: [/\bsteel\b/i, /\bmetal\b/i, /\biron\b/i, /\bcopper\b/i, /\bbrass\b/i, /\bbronze\b/i], label: "Metal" },
  { patterns: [/\blinen\b/i, /\bvelvet\b/i, /\bleather\b/i, /\btextile\b/i, /\bfabric\b/i],   label: "Tecido" },
  { patterns: [/\bceramic\b/i, /\bporcelain\b/i, /\btile\b/i],                                 label: "Cerâmica" },
  { patterns: [/\bbrick\b/i],                                                                    label: "Tijolo" },
  { patterns: [/\bterracotta\b/i, /\bclay\b/i],                                                 label: "Terracota" },
  { patterns: [/\brattan\b/i, /\bwicker\b/i],                                                   label: "Rattan" },
  { patterns: [/\bplaster\b/i, /\bstucco\b/i],                                                  label: "Gesso" },
  { patterns: [/\bstone\b/i],                                                                    label: "Pedra" },
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
  { pattern: /golden.?hour/i,                    label: "Golden hour · luz natural quente" },
  { pattern: /diffused?.?(daylight|light)/i,     label: "Luz natural difusa" },
  { pattern: /natural.?(daylight|light)/i,       label: "Luz natural suave" },
  { pattern: /dramatic.?light/i,                 label: "Iluminação direcional dramática" },
  { pattern: /warm.?ambient/i,                   label: "Luz artificial ambiente quente" },
  { pattern: /soft.?light/i,                     label: "Iluminação difusa suave" },
  { pattern: /recessed.*(ceiling|lighting)/i,    label: "Iluminação de teto embutida" },
  { pattern: /pendant.?light/i,                  label: "Iluminação pendente" },
  { pattern: /sunbeam|sunlight/i,                label: "Luz solar direta com sombras" },
  { pattern: /night.?light|evening.?light/i,     label: "Ambiente noturno / fim de tarde" },
  { pattern: /\bray.?trac/i,                     label: "Iluminação global ray-traced" },
  { pattern: /hdr|high.?dynamic.?range/i,        label: "HDR alto alcance dinâmico" },
  { pattern: /zenital|zenithal/i,                label: "Iluminação zenital / clarabóia" },
];

export function detectLighting(text: string): string {
  for (const { pattern, label } of LIGHTING_KEYWORDS) {
    if (pattern.test(text)) return label;
  }
  return "Luz natural ambiente";
}

// ── Camera detection ──────────────────────────────────────────────────────────

const FOCAL_KEYWORDS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\b16mm\b/i,  label: "16mm ultra grande angular" },
  { pattern: /\b24mm\b/i,  label: "24mm grande angular" },
  { pattern: /\b28mm\b/i,  label: "28mm grande angular" },
  { pattern: /\b35mm\b/i,  label: "35mm padrão" },
  { pattern: /\b50mm\b/i,  label: "50mm prime" },
  { pattern: /\b85mm\b/i,  label: "85mm retrato" },
  { pattern: /\b135mm\b/i, label: "135mm teleobjetiva" },
];

const HEIGHT_KEYWORDS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /eye.?level/i,         label: "Nível dos olhos" },
  { pattern: /aerial|bird.?s.?eye/i, label: "Aérea / vista de pássaro" },
  { pattern: /low.?angle|low.?shot/i, label: "Ângulo baixo" },
  { pattern: /high.?angle/i,        label: "Ângulo alto" },
  { pattern: /overhead/i,           label: "Vista superior" },
];

const LENS_TYPE_KEYWORDS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /wide.?angle/i,  label: "Grande angular" },
  { pattern: /telephoto/i,    label: "Teleobjetiva" },
  { pattern: /prime.?lens/i,  label: "Lente prime" },
  { pattern: /macro/i,        label: "Macro" },
];

export function detectCamera(text: string): CameraResult {
  let focalLength = "Padrão";
  for (const { pattern, label } of FOCAL_KEYWORDS) {
    if (pattern.test(text)) { focalLength = label; break; }
  }

  let height = "Nível dos olhos";
  for (const { pattern, label } of HEIGHT_KEYWORDS) {
    if (pattern.test(text)) { height = label; break; }
  }

  let type = "Full-frame";
  if (/wide.?angle/i.test(text) || /\b(16|24|28)mm\b/i.test(text)) type = "Grande angular";
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
    label:       "Excelente",
    description: "Prompt pronto para produção com descritores precisos de material, iluminação e composição.",
    tier:        "excellent",
  };
  if (score >= 80) return {
    label:       "Forte",
    description: "Prompt de alta qualidade. Pequenos refinamentos podem aumentar ainda mais o fotorrealismo.",
    tier:        "strong",
  };
  if (score >= 70) return {
    label:       "Bom",
    description: "Base sólida. Adicionar propriedades dos materiais e detalhes de iluminação melhorará os resultados.",
    tier:        "good",
  };
  return {
    label:       "A Melhorar",
    description: "Adicione propriedades físicas dos materiais, direção da luz e configurações de câmera para melhor resultado.",
    tier:        "limited",
  };
}
