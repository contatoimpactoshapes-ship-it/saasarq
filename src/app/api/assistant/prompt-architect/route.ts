import { auth }        from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import {
  PROMPT_ARCHITECT_SYSTEM_PROMPT,
  buildContextualSystemPrompt,
  type ProjectContext,
  type PromptArchitectResponse,
} from "@/lib/assistant/prompt-architect";
import { prisma } from "@/lib/prisma";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES     = 5 * 1024 * 1024; // 5 MB
const VISION_MODEL  = "claude-haiku-4-5-20251001";
const MAX_TOKENS    = 4096;

// ── JSON extraction helper ────────────────────────────────────────────────────

function clamp(n: unknown): number {
  const v = Number(n);
  return Number.isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : 0;
}

function parseStructured(raw: string): PromptArchitectResponse {
  const text = raw.trim();

  let parsed: Record<string, unknown> | null = null;

  try { parsed = JSON.parse(text); } catch { /* fall through */ }

  if (!parsed) {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { parsed = JSON.parse(match[0]); } catch { /* fall through */ }
    }
  }

  if (parsed && typeof parsed === "object") {
    const str = (k: string) => typeof parsed[k] === "string" ? parsed[k] as string : null;
    return {
      prompt:                 typeof parsed.prompt === "string" ? parsed.prompt : text,
      imageSummary:           str("imageSummary"),
      qualityScore:           clamp(parsed.qualityScore),
      suggestions:            Array.isArray(parsed.suggestions)
                                ? (parsed.suggestions as unknown[]).filter((s): s is string => typeof s === "string")
                                : [],
      recommendedModel:       typeof parsed.recommendedModel === "string"
                                ? parsed.recommendedModel
                                : "Nano Banana 2",
      recommendedAspectRatio: typeof parsed.recommendedAspectRatio === "string"
                                ? parsed.recommendedAspectRatio
                                : "16:9",
      // v2 structured fields
      layoutAnalysis:         str("layoutAnalysis"),
      materialAnalysis:       str("materialAnalysis"),
      lightingAnalysis:       str("lightingAnalysis"),
      cameraAnalysis:         str("cameraAnalysis"),
      furnitureAnalysis:      str("furnitureAnalysis"),
      architecturalElements:  str("architecturalElements"),
    };
  }

  return {
    prompt:                 text,
    imageSummary:           null,
    qualityScore:           0,
    suggestions:            [],
    recommendedModel:       "Nano Banana 2",
    recommendedAspectRatio: "16:9",
  };
}

// ── Context resolver ──────────────────────────────────────────────────────────

async function resolveSystemPrompt(
  clerkId:      string,
  spaceId:      string | null,
  spaceName:    string | null,
  workflowName: string | null,
): Promise<string> {
  if (!spaceId || !spaceName) return PROMPT_ARCHITECT_SYSTEM_PROMPT;

  const dbUser = await prisma.user.findFirst({
    where:  { clerkId },
    select: { id: true },
  });
  if (!dbUser) return PROMPT_ARCHITECT_SYSTEM_PROMPT;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [historyResult, spaceResult] = await Promise.allSettled([
    prisma.promptAnalysis.findMany({
      where: {
        spaceId,
        userId:       dbUser.id,
        qualityScore: { gt: 0 },
        createdAt:    { gte: thirtyDaysAgo },
      },
      orderBy: { qualityScore: "desc" },
      take:    5,
      select:  { prompt: true, qualityScore: true, recommendedModel: true },
    }),
    prisma.space.findFirst({
      where:  { id: spaceId, userId: dbUser.id },
      select: { canvasData: true },
    }),
  ]);

  const history  = historyResult.status === "fulfilled" ? historyResult.value : [];
  const spaceRaw = spaceResult.status   === "fulfilled" ? spaceResult.value   : null;

  type SpaceMeta = { briefing?: string; materials?: string[]; styleTag?: string };
  const meta = ((spaceRaw?.canvasData ?? {}) as Record<string, unknown>).metadata as SpaceMeta | undefined;

  const context: ProjectContext = {
    spaceName:    spaceName,
    workflowName: workflowName ?? undefined,
    briefing:     meta?.briefing,
    materials:    meta?.materials,
    styleTag:     meta?.styleTag,
    history,
  };

  return buildContextualSystemPrompt(context);
}

// ── Fallback (no API key) ─────────────────────────────────────────────────────

function buildFallback(message: string, hasImage: boolean): PromptArchitectResponse {
  const prompt = message.trim()
    ? `${message.trim()}, fotografia arquitetônica profissional, luz natural difusa, materiais fisicamente precisos, renderização fotorrealista hiper-realista, ultra-detalhado 8K, sem artefatos de render, qualidade editorial premium`
    : "Interior contemporâneo minimalista, janelas do piso ao teto, piso em carvalho natural com veios expressivos, luz natural suave e difusa, câmera full-frame lente 35mm nível dos olhos, materiais fisicamente precisos, fotografia arquitetônica editorial, ultra-detalhado 8K";

  return {
    prompt,
    imageSummary: hasImage ? "Modo de análise simplificada ativo." : null,
    qualityScore: 0,
    suggestions: [
      "Descreva os materiais com propriedades físicas: grãos naturais, textura, reflexo, desgaste",
      "Especifique a iluminação: origem, direção, temperatura de cor (ex: luz difusa quente 3000K)",
      "Defina a câmera: altura, distância focal, perspectiva (ex: nível dos olhos, 35mm, grande angular)",
    ],
    recommendedModel:       "Nano Banana 2",
    recommendedAspectRatio: "16:9",
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Parse FormData ──────────────────────────────────────────────────────
    const form         = await req.formData();
    const mode         = (form.get("mode")         as string | null) ?? "chat";
    const message      = (form.get("message")      as string | null) ?? "";
    const imageFile    = form.get("image") as File | null;
    const spaceId      = (form.get("spaceId")      as string | null) || null;
    const spaceName    = (form.get("spaceName")    as string | null) || null;
    const workflowName = (form.get("workflowName") as string | null) || null;

    // ── Image validation ────────────────────────────────────────────────────
    if (imageFile && imageFile.size > 0) {
      if (!ALLOWED_TYPES.has(imageFile.type)) {
        return NextResponse.json(
          { error: "Tipo de imagem não suportado. Use JPG, PNG, WebP ou GIF." },
          { status: 400 },
        );
      }
      if (imageFile.size > MAX_BYTES) {
        return NextResponse.json(
          { error: "Imagem muito grande. Máximo permitido: 5 MB." },
          { status: 400 },
        );
      }
    }

    const hasImage = !!imageFile && imageFile.size > 0;

    // ── No API key — return structured fallback ─────────────────────────────
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      console.warn("[prompt-architect] ANTHROPIC_API_KEY not set — returning fallback");
      return NextResponse.json({ ...buildFallback(message, hasImage), analysisMode: "fallback" });
    }

    // ── Resolve contextual system prompt ────────────────────────────────────
    const systemPrompt = await resolveSystemPrompt(userId, spaceId, spaceName, workflowName);

    // ── Build Claude message content ────────────────────────────────────────
    type ContentBlock =
      | { type: "text"; text: string }
      | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

    let userContent: string | ContentBlock[];

    if (hasImage) {
      const bytes  = await imageFile!.arrayBuffer();
      const base64 = Buffer.from(bytes).toString("base64");

      const textPrompt = message.trim()
        || (mode === "image_to_prompt"
          ? "Analise esta imagem e gere um prompt profissional para renderização arquitetônica com IA."
          : "Analise esta imagem e me ajude a entender como melhorar este espaço.");

      userContent = [
        {
          type:   "image",
          source: { type: "base64", media_type: imageFile!.type, data: base64 },
        },
        { type: "text", text: textPrompt },
      ];
    } else {
      userContent = message.trim()
        || "Gere um prompt profissional para renderização arquitetônica fotorrealista de um interior moderno minimalista.";
    }

    // ── Call Anthropic API ──────────────────────────────────────────────────
    const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method:  "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      VISION_MODEL,
        max_tokens: MAX_TOKENS,
        system:     systemPrompt,
        messages:   [{ role: "user", content: userContent }],
      }),
    });

    if (!apiRes.ok) {
      console.error("[prompt-architect] Anthropic error:", await apiRes.text());
      return NextResponse.json({ ...buildFallback(message, hasImage), analysisMode: "fallback" });
    }

    const apiData = await apiRes.json() as {
      content?:    Array<{ text?: string }>;
      stop_reason?: string;
      usage?:      { input_tokens?: number; output_tokens?: number };
    };

    const raw         = apiData.content?.[0]?.text ?? "";
    const stopReason  = apiData.stop_reason ?? "unknown";
    const inputTok    = apiData.usage?.input_tokens  ?? 0;
    const outputTok   = apiData.usage?.output_tokens ?? 0;
    const truncated   = stopReason === "max_tokens";

    // [PHASE-1 VALIDATION] Remove after quality validation is complete
    console.log(
      `[prompt-architect] response: chars=${raw.length} est_tokens≈${Math.round(raw.length / 4)}` +
      ` stop_reason=${stopReason} input_tokens=${inputTok} output_tokens=${outputTok}` +
      ` truncated=${truncated} has_image=${hasImage}`
    );

    const result    = parseStructured(raw);
    const jsonValid = result.qualityScore > 0 || result.imageSummary !== null || result.suggestions.length > 0;

    // [PHASE-1 VALIDATION] Remove after quality validation is complete
    console.log(
      `[prompt-architect] parsed: json_valid=${jsonValid} quality_score=${result.qualityScore}` +
      ` suggestions=${result.suggestions.length} prompt_chars=${result.prompt.length}`
    );

    if (truncated) {
      // [PHASE-1 VALIDATION] Remove after quality validation is complete
      console.warn(`[prompt-architect] TRUNCATED — response cut at ${MAX_TOKENS} tokens. Consider increasing MAX_TOKENS further.`);
    }

    return NextResponse.json({ ...result, analysisMode: "anthropic" });
  } catch (err) {
    console.error("[POST /api/assistant/prompt-architect]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
