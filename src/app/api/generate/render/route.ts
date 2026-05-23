import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser, debitCredits, refundCredits, hasEnoughCredits } from "@/lib/credits";
import { submitFalJobRaw } from "@/lib/fal";
import { getFalModelId } from "@/lib/model-lookup";
import { logAndSanitize, sanitizeError } from "@/lib/errors";

const FALLBACK_MODEL = "fal-ai/flux/dev/image-to-image";
const CREDIT_COST = 120;

const renderSchema = z.object({
  imageUrl:     z.string().url(),
  prompt:       z.string().max(10000).default(""),
  style:        z.string().default("exterior-day"),
  strength:     z.number().min(0.1).max(0.99).default(0.85),
  renderModel:  z.string().default("render-flux-dev"),
});

// Style → base prompt mapping
// Each prompt is engineered to convert a raw 3D model export into a photorealistic architectural render
const STYLE_PROMPTS: Record<string, string> = {
  "exterior-day":
    "photorealistic architectural exterior rendering, convert 3D model to photorealistic image, natural golden hour sunlight, clear blue sky with soft clouds, professional real estate photography, realistic facade materials and textures, lush landscaping with trees and grass, ultra-high definition 8K quality, ray-traced shadows, architectural visualization, no CGI look",

  "exterior-night":
    "photorealistic architectural exterior rendering at night, convert 3D model to photorealistic image, dramatic exterior lighting with warm glowing windows, landscape spotlights, city sky ambient glow, professional architectural night photography, ultra-high definition 8K quality, long exposure look, atmospheric depth",

  "interior-day":
    "photorealistic architectural interior rendering, convert 3D model to photorealistic interior, soft natural daylight through large windows, sunbeams casting realistic shadows, professional interior design photography, realistic wood floors, marble surfaces, elegant furniture and decor, neutral warm tones, 8K ultra quality, no CGI look",

  "interior-night":
    "photorealistic architectural interior rendering at night, convert 3D model to photorealistic interior, warm ambient artificial lighting, pendant lights, recessed ceiling lighting, cozy sophisticated atmosphere, professional interior photography, realistic surfaces and materials, 8K ultra quality",

  "artistic":
    "stunning architectural concept rendering, cinematic dramatic lighting, professional CGI presentation quality, award-winning architectural visualization, striking composition, vibrant yet realistic colors, hero shot perspective, ultra-detailed 8K, suitable for architectural proposal",

  "custom": "",
};

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = renderSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const firstField  = Object.keys(fieldErrors)[0] ?? "desconhecido";
      const firstMsg    = fieldErrors[firstField as keyof typeof fieldErrors]?.[0] ?? "valor inválido";
      return NextResponse.json(
        { error: `Dados inválidos: campo "${firstField}" — ${firstMsg}`, details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { imageUrl, prompt, style, strength, renderModel } = parsed.data;

    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses[0]?.emailAddress ?? "";
    const user = await getOrCreateUser(clerkId, email);

    const enough = await hasEnoughCredits(user.id, CREDIT_COST);
    if (!enough) {
      return NextResponse.json(
        { error: "Créditos insuficientes", required: CREDIT_COST },
        { status: 402 }
      );
    }

    // Build final prompt:
    // - "custom" style: user prompt IS the full prompt (no base)
    // - other styles: combine base + user additions
    // - fallback: exterior-day base if nothing provided
    const basePrompt = STYLE_PROMPTS[style] ?? "";
    const userText   = prompt.trim();
    const finalPrompt =
      basePrompt && userText ? `${basePrompt}, ${userText}`
      : basePrompt           ? basePrompt
      : userText             ? userText
      : STYLE_PROMPTS["exterior-day"];

    const resolvedFalModel = getFalModelId(renderModel) ?? FALLBACK_MODEL;

    // Build model-specific FAL input — each model family has different param names/shapes
    const buildFalInput = (): Record<string, unknown> => {
      const common = { prompt: finalPrompt, enable_safety_checker: false };

      switch (renderModel) {
        // ── Flux Pro Redux ─────────────────────────────────────────
        case "render-flux-pro":
          return { ...common, image_url: imageUrl, num_images: 1 };

        // ── Flux Kontext (Dev + Pro) ───────────────────────────────
        case "render-flux-kontext-dev":
        case "render-flux-kontext-pro":
          return { ...common, image_url: imageUrl, num_images: 1 };

        // ── Google Nano Banana family ──────────────────────────────
        // API requires image_urls (array), not image_url (string)
        case "render-nano-banana":
        case "render-nano-banana-2":
        case "render-nano-banana-pro":
          return { ...common, image_urls: [imageUrl] };

        // ── Ideogram V2 Remix ──────────────────────────────────────
        case "render-ideogram":
          return {
            ...common,
            image_url:    imageUrl,
            image_weight: Math.round((1 - strength) * 100) / 100,
          };

        // ── Ideogram V3 ────────────────────────────────────────────
        case "render-ideogram-v3":
          return {
            ...common,
            image_url:        imageUrl,
            rendering_speed:  "QUALITY",
          };

        // ── Qwen Image 2 Pro ───────────────────────────────────────
        case "render-qwen-pro":
          return { ...common, image_url: imageUrl };

        // ── GPT Image 2 ────────────────────────────────────────────
        case "render-gpt-image-2":
          return { ...common, image_url: imageUrl, quality: "high" };

        // ── SDXL (init_image_url) ──────────────────────────────────
        case "render-sdxl":
          return {
            ...common,
            init_image_url:      imageUrl,
            strength,
            num_inference_steps: 30,
            num_images:          1,
          };

        // ── Flux Dev (default) ─────────────────────────────────────
        default:
          return {
            ...common,
            image_url:           imageUrl,
            strength,
            num_inference_steps: 40,
            guidance_scale:      3.5,
            num_images:          1,
          };
      }
    };

    const generation = await prisma.generation.create({
      data: {
        userId:      user.id,
        tool:        "IMAGE_EDIT",
        model:       renderModel,
        prompt:      finalPrompt,
        parameters:  { sourceUrl: imageUrl, style, strength },
        status:      "PENDING",
        outputUrls:  [],
        creditsCost: CREDIT_COST,
      },
    });

    await debitCredits(user.id, CREDIT_COST, `Renderização 3D — ${style}`);

    const falInput = buildFalInput();

    const webhookUrl = process.env.FAL_WEBHOOK_URL
      ? `${process.env.FAL_WEBHOOK_URL}?generationId=${generation.id}`
      : undefined;

    let falRequestId: string;
    try {
      falRequestId = await submitFalJobRaw(resolvedFalModel, falInput, webhookUrl);
    } catch (falError: unknown) {
      const raw      = falError instanceof Error ? falError.message : String(falError);
      const friendly = sanitizeError(falError);
      console.error("[FAL render error]", raw, falError);
      await refundCredits(user.id, CREDIT_COST, `Reembolso: falha ao renderizar`);
      await prisma.generation.update({
        where: { id: generation.id },
        data:  { status: "FAILED", errorMessage: raw },
      });
      return NextResponse.json({ error: friendly }, { status: 500 });
    }

    await prisma.generation.update({
      where: { id: generation.id },
      data:  { status: "PROCESSING", falRequestId },
    });

    return NextResponse.json({
      generationId: generation.id,
      falRequestId,
      creditsCost: CREDIT_COST,
    });
  } catch (error) {
    const friendly = logAndSanitize("POST /api/generate/render", error);
    return NextResponse.json({ error: friendly }, { status: 500 });
  }
}
