import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser, debitCredits, refundCredits, hasEnoughCredits } from "@/lib/credits";
import { submitFalJobRaw } from "@/lib/fal";
import { getFalModelId, getFalVideoImgModelId } from "@/lib/model-lookup";
import { getVideoModel } from "@/lib/models";

const videoSchema = z.object({
  prompt:      z.string().max(5000).default(""),
  imageUrl:    z.string().url().optional(),
  videoModel:  z.string().default("kling-2.1-pro"),
  duration:    z.number().min(3).max(20).default(5),
  aspectRatio: z.string().default("16:9"),
});

// ── Sora 2 via OpenAI API ──────────────────────────────────────────────────────
async function submitSoraJob(
  prompt: string,
  imageUrl: string | undefined,
  duration: number,
  aspectRatio: string,
): Promise<string> {
  const SIZE_MAP: Record<string, string> = {
    "16:9": "1920x1080",
    "9:16": "1080x1920",
    "1:1":  "1080x1080",
    "4:5":  "1080x1350",
  };

  const body: Record<string, unknown> = {
    model:    "sora-2",
    prompt,
    n:        1,
    size:     SIZE_MAP[aspectRatio] ?? "1920x1080",
    duration,
  };
  if (imageUrl) body.image_url = imageUrl;

  const res = await fetch("https://api.openai.com/v1/video/generations", {
    method:  "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? `OpenAI error ${res.status}`);
  }

  const data = await res.json() as { id: string };
  return data.id;
}

// ── FAL video input builder (per-model params) ─────────────────────────────────
function buildFalVideoInput(
  model: string,
  prompt: string,
  imageUrl: string | undefined,
  duration: number,
  aspectRatio: string,
): Record<string, unknown> {
  const isImg = !!imageUrl;

  switch (model) {
    // ── Kling ─────────────────────────────────────────────────────────────────
    case "kling-2.1-pro":
    case "kling-2.5":
      return {
        prompt,
        ...(isImg ? { image_url: imageUrl } : {}),
        duration:     String(duration),
        aspect_ratio: aspectRatio,
      };

    // ── Runway Gen-3 ──────────────────────────────────────────────────────────
    case "runway-gen3":
      return isImg
        ? { prompt_image: imageUrl, prompt_text: prompt, duration, ratio: aspectRatio }
        : { prompt_text: prompt, duration, ratio: aspectRatio };

    // ── Luma Dream Machine ────────────────────────────────────────────────────
    case "luma-ray2":
      return {
        prompt,
        aspect_ratio: aspectRatio,
        ...(isImg
          ? { keyframes: { frame0: { type: "image", url: imageUrl } } }
          : {}),
      };

    // ── MiniMax Hailuo ────────────────────────────────────────────────────────
    case "minimax-hailuo":
      return isImg
        ? { prompt, first_frame_image: imageUrl }
        : { prompt };

    // ── HunyuanVideo ─────────────────────────────────────────────────────────
    case "hunyuan": {
      const RES: Record<string, string> = {
        "16:9": "1280x720", "9:16": "720x1280", "1:1": "960x960",
      };
      return {
        prompt,
        video_length:        duration * 8, // approximate frames at 8fps
        resolution:          RES[aspectRatio] ?? "1280x720",
        num_inference_steps: 30,
        ...(isImg ? { image_url: imageUrl } : {}),
      };
    }

    // ── Default fallback ──────────────────────────────────────────────────────
    default:
      return {
        prompt,
        ...(isImg ? { image_url: imageUrl } : {}),
        duration:     String(duration),
        aspect_ratio: aspectRatio,
      };
  }
}

// ── POST ───────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body   = await req.json();
    const parsed = videoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { prompt, imageUrl, videoModel, duration, aspectRatio } = parsed.data;

    if (!prompt.trim() && !imageUrl) {
      return NextResponse.json(
        { error: "Forneça um prompt ou uma imagem de referência." },
        { status: 400 }
      );
    }

    const modelDef = getVideoModel(videoModel);
    if (!modelDef) {
      return NextResponse.json({ error: `Modelo desconhecido: ${videoModel}` }, { status: 400 });
    }

    const CREDIT_COST = modelDef.credits;

    const clerkUser = await currentUser();
    const email     = clerkUser?.emailAddresses[0]?.emailAddress ?? "";
    const user      = await getOrCreateUser(clerkId, email);

    const enough = await hasEnoughCredits(user.id, CREDIT_COST);
    if (!enough) {
      return NextResponse.json({ error: "Créditos insuficientes", required: CREDIT_COST }, { status: 402 });
    }

    const generation = await prisma.generation.create({
      data: {
        userId:      user.id,
        tool:        "VIDEO_GENERATE",
        model:       videoModel,
        prompt:      prompt.trim(),
        parameters:  { imageUrl, duration, aspectRatio },
        status:      "PENDING",
        outputUrls:  [],
        creditsCost: CREDIT_COST,
      },
    });

    await debitCredits(user.id, CREDIT_COST, `Vídeo — ${modelDef.name} ${duration}s ${aspectRatio}`);

    let requestId: string;

    try {
      if (modelDef.provider === "openai") {
        // ── Sora 2 via OpenAI ────────────────────────────────────────────────
        requestId = await submitSoraJob(prompt, imageUrl, duration, aspectRatio);
      } else {
        // ── Other models via FAL ─────────────────────────────────────────────
        const falModelId = imageUrl
          ? (getFalVideoImgModelId(videoModel) ?? getFalModelId(videoModel))
          : getFalModelId(videoModel);

        if (!falModelId) throw new Error(`Endpoint FAL não encontrado para: ${videoModel}`);

        const falInput   = buildFalVideoInput(videoModel, prompt, imageUrl, duration, aspectRatio);
        const webhookUrl = process.env.FAL_WEBHOOK_URL
          ? `${process.env.FAL_WEBHOOK_URL}?generationId=${generation.id}`
          : undefined;

        requestId = await submitFalJobRaw(falModelId, falInput, webhookUrl);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Video submit error]", msg);
      await refundCredits(user.id, CREDIT_COST, `Reembolso: falha ao gerar vídeo`);
      await prisma.generation.update({
        where: { id: generation.id },
        data:  { status: "FAILED", errorMessage: msg },
      });
      return NextResponse.json({ error: `Falha: ${msg}` }, { status: 500 });
    }

    await prisma.generation.update({
      where: { id: generation.id },
      data:  { status: "PROCESSING", falRequestId: requestId },
    });

    return NextResponse.json({ generationId: generation.id, falRequestId: requestId, creditsCost: CREDIT_COST });
  } catch (error) {
    console.error("[POST /api/generate/video]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
