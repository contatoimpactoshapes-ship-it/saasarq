import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { emitAdminEvent } from "@/lib/realtime";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser, tryDebitCredits, refundCredits } from "@/lib/credits";
import { submitFalJobRaw, buildFalWebhookUrl } from "@/lib/fal";

const CREDIT_COST = 120;

// fal-ai/flux-pro/v1/fill — best open inpainting model
// mask_url: white = fill, black = keep
const INPAINT_MODEL = "fal-ai/flux-pro/v1/fill";

const inpaintSchema = z.object({
  imageUrl: z.string().url(),
  maskUrl:  z.string().url(),
  prompt:   z.string().max(10000).default(""),
});

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body   = await req.json();
    const parsed = inpaintSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { imageUrl, maskUrl, prompt } = parsed.data;

    const clerkUser = await currentUser();
    const email     = clerkUser?.emailAddresses[0]?.emailAddress ?? "";
    const user      = await getOrCreateUser(clerkId, email);

    const debited = await tryDebitCredits(user.id, CREDIT_COST, "Editor de imagens — inpainting");
    if (!debited) {
      return NextResponse.json(
        { error: "Créditos insuficientes", required: CREDIT_COST },
        { status: 402 }
      );
    }

    const finalPrompt = prompt.trim() || "photorealistic architectural render, same scene";

    const generation = await prisma.generation.create({
      data: {
        userId:      user.id,
        tool:        "IMAGE_EDIT",
        model:       "inpaint-flux-fill",
        prompt:      finalPrompt,
        parameters:  { sourceUrl: imageUrl, maskUrl },
        status:      "PENDING",
        outputUrls:  [],
        creditsCost: CREDIT_COST,
      },
    });

    const falInput = {
      image_url:           imageUrl,
      mask_url:            maskUrl,
      prompt:              finalPrompt,
      num_inference_steps: 28,
      guidance_scale:      3.5,
      enable_safety_checker: false,
    };

    const webhookUrl = buildFalWebhookUrl(generation.id);

    let falRequestId: string;
    try {
      falRequestId = await submitFalJobRaw(INPAINT_MODEL, falInput, webhookUrl);
    } catch (falError: unknown) {
      const msg = falError instanceof Error ? falError.message : String(falError);
      await refundCredits(user.id, CREDIT_COST, "Reembolso: falha no inpaint");
      await prisma.generation.update({
        where: { id: generation.id },
        data:  { status: "FAILED", errorMessage: msg },
      });
      return NextResponse.json({ error: `Falha: ${msg}` }, { status: 500 });
    }

    await prisma.generation.update({
      where: { id: generation.id },
      data:  { status: "PROCESSING", falRequestId },
    });

    emitAdminEvent({ type: "generation:started", id: crypto.randomUUID(), ts: Date.now(), generationId: generation.id, userId: user.id, tool: "IMAGE_EDIT", model: "inpaint-flux-fill", creditsCost: CREDIT_COST });

    return NextResponse.json({
      generationId: generation.id,
      falRequestId,
      creditsCost: CREDIT_COST,
    });
  } catch (error) {
    console.error("[POST /api/generate/inpaint]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
