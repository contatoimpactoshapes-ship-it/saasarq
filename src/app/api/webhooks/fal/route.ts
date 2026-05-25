import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { refundCredits } from "@/lib/credits";
import { saveImageFromUrl } from "@/lib/r2";

function validateWebhookSecret(req: NextRequest): boolean {
  const expected = process.env.FAL_WEBHOOK_SECRET;
  // If no secret is configured, skip enforcement (backward compat for inflight jobs).
  // Set FAL_WEBHOOK_SECRET in production to enforce validation.
  if (!expected) {
    console.warn("[FAL webhook] FAL_WEBHOOK_SECRET not set — running without auth");
    return true;
  }
  const provided = req.nextUrl.searchParams.get("secret") ?? "";
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided, "utf8"), Buffer.from(expected, "utf8"));
}

// Extract output URLs from any FAL webhook payload
function extractOutputUrls(payload: Record<string, unknown>): string[] {
  if (Array.isArray(payload.images)) {
    return (payload.images as { url: string }[]).map((i) => i.url).filter(Boolean);
  }
  if (payload.video && typeof (payload.video as Record<string, unknown>).url === "string") {
    return [(payload.video as Record<string, unknown>).url as string];
  }
  if (payload.audio && typeof (payload.audio as Record<string, unknown>).url === "string") {
    return [(payload.audio as Record<string, unknown>).url as string];
  }
  if (typeof payload.output === "string") return [payload.output];
  if (typeof payload.output_url === "string") return [payload.output_url];
  return [];
}

export async function POST(req: NextRequest) {
  try {
    if (!validateWebhookSecret(req)) {
      console.warn("[FAL webhook] Rejected — invalid secret");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const generationId = req.nextUrl.searchParams.get("generationId");
    if (!generationId) {
      return NextResponse.json({ error: "Missing generationId" }, { status: 400 });
    }

    const body = await req.json();

    const generation = await prisma.generation.findUnique({
      where: { id: generationId },
      include: { user: { select: { id: true } } },
    });

    if (!generation) {
      return NextResponse.json({ error: "Generation not found" }, { status: 404 });
    }

    const isSuccess = body.status === "OK" || body.status === "COMPLETED" || body.payload;
    const isError = body.status === "ERROR" || body.status === "FAILED";

    if (isSuccess && body.payload) {
      const rawUrls = extractOutputUrls(body.payload as Record<string, unknown>);

      let outputUrls: string[] = rawUrls;
      if (generation.tool === "IMAGE_GENERATE" || generation.tool.startsWith("IMAGE_")) {
        try {
          outputUrls = await Promise.all(
            rawUrls.map((url, i) => saveImageFromUrl(url, generationId, i))
          );
        } catch {
          outputUrls = rawUrls;
        }
      }

      await prisma.generation.update({
        where: { id: generationId },
        data: { status: "COMPLETED", outputUrls },
      });
    } else if (isError) {
      await refundCredits(
        generation.user.id,
        generation.creditsCost,
        `Reembolso automático: falha via webhook ${generationId}`
      );
      await prisma.generation.update({
        where: { id: generationId },
        data: {
          status: "FAILED",
          errorMessage: body.error ?? "Falha no processamento",
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[POST /api/webhooks/fal]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
