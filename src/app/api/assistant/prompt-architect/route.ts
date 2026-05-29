import { auth }        from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import {
  PROMPT_ARCHITECT_SYSTEM_PROMPT,
  type PromptArchitectResponse,
} from "@/lib/assistant/prompt-architect";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES     = 5 * 1024 * 1024; // 5 MB
const VISION_MODEL  = "claude-haiku-4-5-20251001";

// ── JSON extraction helper ────────────────────────────────────────────────────

function parseStructured(raw: string): PromptArchitectResponse {
  const text = raw.trim();
  // Try direct parse
  try { return JSON.parse(text); } catch { /* fall through */ }
  // Try extracting first {...} block
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch { /* fall through */ }
  }
  // Treat entire text as prompt
  return {
    prompt:                 text,
    imageSummary:           null,
    suggestions:            [],
    recommendedModel:       "Nano Banana 2",
    recommendedAspectRatio: "16:9",
  };
}

// ── Fallback (no API key) ─────────────────────────────────────────────────────

function buildFallback(message: string, hasImage: boolean): PromptArchitectResponse {
  const prompt = message.trim()
    ? `${message.trim()}, photorealistic architectural visualization, 8K, ultra-detailed, professional render`
    : "Modern minimalist interior, floor-to-ceiling windows, warm oak floors, soft diffused daylight, 8K photorealistic architectural visualization";

  return {
    prompt,
    imageSummary: hasImage
      ? "Imagem recebida. Configure ANTHROPIC_API_KEY para análise real com visão computacional."
      : null,
    suggestions: [
      "Adicione iluminação específica: golden hour, soft diffused light, dramatic shadows",
      "Especifique materiais: marble, oak, exposed concrete, glass, brass",
      "Defina perspectiva: wide-angle, eye-level, 35mm architectural lens",
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
    const form      = await req.formData();
    const mode      = (form.get("mode")    as string | null) ?? "chat";
    const message   = (form.get("message") as string | null) ?? "";
    const imageFile = form.get("image") as File | null;

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
        "Content-Type":    "application/json",
        "x-api-key":       anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      VISION_MODEL,
        max_tokens: 1024,
        system:     PROMPT_ARCHITECT_SYSTEM_PROMPT,
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
