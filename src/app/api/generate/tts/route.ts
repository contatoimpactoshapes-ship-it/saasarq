import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { emitAdminEvent } from "@/lib/realtime";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser, debitCredits, refundCredits, hasEnoughCredits } from "@/lib/credits";
import { submitFalJobRaw, buildFalWebhookUrl } from "@/lib/fal";

const CREDIT_COST = 100;

// FAL model for text-to-speech
const FAL_TTS_MODEL = "fal-ai/playai-tts";

const schema = z.object({
  text: z.string().min(1).max(5000),
  voice: z.string().default("pt-BR-AntonioNeural"),
});

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { text, voice } = parsed.data;

    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses[0]?.emailAddress ?? "";
    const user = await getOrCreateUser(clerkId, email);

    const enough = await hasEnoughCredits(user.id, CREDIT_COST);
    if (!enough) {
      return NextResponse.json(
        { error: "Créditos insuficientes", required: CREDIT_COST, available: user.credits },
        { status: 402 }
      );
    }

    const generation = await prisma.generation.create({
      data: {
        userId: user.id,
        tool: "AUDIO_TTS",
        model: voice,
        prompt: text,
        parameters: { voice },
        status: "PENDING",
        outputUrls: [],
        creditsCost: CREDIT_COST,
      },
    });

    await debitCredits(user.id, CREDIT_COST, `TTS: narração de voz`);

    const falInput: Record<string, unknown> = {
      input: text,
      voice,
    };

    const webhookUrl = buildFalWebhookUrl(generation.id);

    let falRequestId: string | undefined;
    try {
      falRequestId = await submitFalJobRaw(FAL_TTS_MODEL, falInput, webhookUrl);
    } catch (falError) {
      console.error("[FAL TTS submit error]", falError);
      await refundCredits(user.id, CREDIT_COST, `Reembolso: falha ao submeter TTS`);
      await prisma.generation.update({
        where: { id: generation.id },
        data: { status: "FAILED", errorMessage: "Falha ao submeter para FAL.ai" },
      });
      return NextResponse.json({ error: "Falha ao iniciar geração de áudio" }, { status: 500 });
    }

    await prisma.generation.update({
      where: { id: generation.id },
      data: { status: "PROCESSING", falRequestId },
    });

    emitAdminEvent({ type: "generation:started", id: crypto.randomUUID(), ts: Date.now(), generationId: generation.id, userId: user.id, tool: "AUDIO_TTS", model: voice, creditsCost: CREDIT_COST });

    return NextResponse.json({
      generationId: generation.id,
      falRequestId,
      creditsCost: CREDIT_COST,
    });
  } catch (error) {
    console.error("[POST /api/generate/tts]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
