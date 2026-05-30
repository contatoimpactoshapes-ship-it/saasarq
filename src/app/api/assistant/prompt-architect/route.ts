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
const MAX_TOKENS    = 1500;

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
    return {
      prompt:                 typeof parsed.prompt === "string" ? parsed.prompt : text,
      imageSummary:           typeof parsed.imageSummary === "string" ? parsed.imageSummary : null,
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
    ? `${message.trim()}, architectural photography, natural light, physically accurate materials, photorealistic render, 8K ultra-detailed, no CGI artifacts, editorial quality`
    : "Modern minimalist interior, floor-to-ceiling windows, warm oak flooring with natural grain, soft diffused daylight, full-frame camera 35mm lens, physically accurate materials, editorial architectural photography, 8K ultra-detailed";

  return {
    prompt,
    imageSummary: hasImage ? "Modo de análise simplificada ativo." : null,
    qualityScore: 0,
    suggestions: [
      "Descreva os materiais com propriedades físicas: grãos naturais, textura, reflexo, desgaste",
      "Especifique iluminação: origem, direção, temperatura de cor (ex: warm 3000K diffused daylight)",
      "Defina câmera: altura, distância focal, perspectiva (ex: eye-level, 35mm, wide-angle)",
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
      return NextResponse.json(buildFallback(message, hasImage));
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
      return NextResponse.json(buildFallback(message, hasImage));
    }

    const apiData = await apiRes.json() as { content?: Array<{ text?: string }> };
    const raw     = apiData.content?.[0]?.text ?? "";
    const result  = parseStructured(raw);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/assistant/prompt-architect]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
