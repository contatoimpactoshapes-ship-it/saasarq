import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { emitAdminEvent } from "@/lib/realtime";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser, debitCredits, refundCredits, hasEnoughCredits } from "@/lib/credits";
import { submitFalJobRaw, buildFalWebhookUrl } from "@/lib/fal";
import { getImageModel } from "@/lib/models";
import { meetsMinPlan, checkConcurrencyLimit, ECONOMY_ERRORS } from "@/lib/economy";
import type { PlanId } from "@/lib/plans";

// Maps UI aspect ratio values to FAL image_size strings
const ASPECT_TO_FAL: Record<string, string> = {
  "1:1":  "square_hd",
  "16:9": "landscape_16_9",
  "9:16": "portrait_16_9",
  "4:3":  "landscape_4_3",
  "3:4":  "portrait_4_3",
  "21:9": "landscape_16_9",
};

const generateSchema = z.object({
  prompt:      z.string().min(3).max(2000),
  model:       z.string(),
  aspectRatio: z.string().default("1:1"),
  numImages:   z.number().int().min(1).max(4).default(1),
});

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { prompt, model, aspectRatio, numImages } = parsed.data;

    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses[0]?.emailAddress ?? "";
    const user = await getOrCreateUser(clerkId, email);

    // Resolve model from new IMAGE_MODELS config
    const imageModel = getImageModel(model);
    if (!imageModel || !("falId" in imageModel)) {
      return NextResponse.json({ error: "Modelo inválido" }, { status: 400 });
    }

    // Plan check via minPlan field
    if ("minPlan" in imageModel && imageModel.minPlan && !user.isAdmin) {
      if (!meetsMinPlan(user.plan, imageModel.minPlan as PlanId)) {
        return NextResponse.json(
          {
            error: `Este modelo requer plano ${imageModel.minPlan} ou superior`,
            code: ECONOMY_ERRORS.PREMIUM_MODEL_LOCKED,
            minPlan: imageModel.minPlan,
          },
          { status: 403 }
        );
      }
    }

    // Concurrency limit
    const concurrency = await checkConcurrencyLimit(user.id, user.plan);
    if (!concurrency.allowed) {
      return NextResponse.json(
        {
          error: `Limite de gerações simultâneas atingido (${concurrency.active}/${concurrency.limit}). Aguarde uma geração terminar.`,
          code:   ECONOMY_ERRORS.CONCURRENCY_LIMIT,
          limit:  concurrency.limit,
          active: concurrency.active,
        },
        { status: 429 }
      );
    }

    const totalCost = imageModel.credits * numImages;
    const enough = await hasEnoughCredits(user.id, totalCost);
    if (!enough) {
      return NextResponse.json(
        {
          error:    "Créditos insuficientes",
          code:     ECONOMY_ERRORS.INSUFFICIENT_CREDITS,
          required: totalCost,
          current:  user.credits,
        },
        { status: 402 }
      );
    }

    const generation = await prisma.generation.create({
      data: {
        userId:      user.id,
        tool:        "IMAGE_GENERATE",
        model,
        prompt,
        parameters:  { aspectRatio, numImages },
        status:      "PENDING",
        outputUrls:  [],
        creditsCost: totalCost,
      },
    });

    await debitCredits(user.id, totalCost, `Geração: ${imageModel.name} x${numImages}`);

    const falInput: Record<string, unknown> = {
      prompt,
      image_size:            ASPECT_TO_FAL[aspectRatio] ?? "square_hd",
      num_images:            numImages,
      enable_safety_checker: false,
      num_inference_steps:   28,
      guidance_scale:        3.5,
    };

    const webhookUrl = buildFalWebhookUrl(generation.id);

    let falRequestId: string | undefined;
    try {
      falRequestId = await submitFalJobRaw(imageModel.falId, falInput, webhookUrl);
    } catch (falError: unknown) {
      const msg = falError instanceof Error ? falError.message : String(falError);
      console.error("[FAL submit error]", msg);
      await refundCredits(user.id, totalCost, `Reembolso: falha ao submeter geração`);
      await prisma.generation.update({
        where: { id: generation.id },
        data:  { status: "FAILED", errorMessage: msg },
      });
      return NextResponse.json({ error: `Falha ao iniciar geração: ${msg}` }, { status: 500 });
    }

    await prisma.generation.update({
      where: { id: generation.id },
      data:  { status: "PROCESSING", falRequestId },
    });

    emitAdminEvent({ type: "generation:started", id: crypto.randomUUID(), ts: Date.now(), generationId: generation.id, userId: user.id, tool: "IMAGE_GENERATE", model, creditsCost: totalCost });

    return NextResponse.json({ generationId: generation.id, falRequestId, creditsCost: totalCost });
  } catch (error) {
    console.error("[POST /api/generate/image]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
