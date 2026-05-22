import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFalJobStatus, getFalJobResult } from "@/lib/fal";
import { refundCredits } from "@/lib/credits";
import { saveImageFromUrl } from "@/lib/r2";
import { getFalModelId } from "@/lib/model-lookup";

// Extract output URLs from any FAL result payload regardless of media type
function extractOutputUrls(data: unknown): string[] {
  if (!data || typeof data !== "object") return [];
  const d = data as Record<string, unknown>;

  // Images: { images: [{ url }] }
  if (Array.isArray(d.images)) {
    return (d.images as { url: string }[]).map((i) => i.url).filter(Boolean);
  }
  // Video: { video: { url } }
  if (d.video && typeof (d.video as Record<string, unknown>).url === "string") {
    return [(d.video as Record<string, unknown>).url as string];
  }
  // Audio: { audio: { url } }
  if (d.audio && typeof (d.audio as Record<string, unknown>).url === "string") {
    return [(d.audio as Record<string, unknown>).url as string];
  }
  // Generic: { output: "url" } or { output_url: "url" }
  if (typeof d.output === "string") return [d.output];
  if (typeof d.output_url === "string") return [d.output_url];

  return [];
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const generation = await prisma.generation.findUnique({
      where: { id: params.id },
      include: { user: { select: { clerkId: true, id: true } } },
    });

    if (!generation) {
      return NextResponse.json({ error: "Geração não encontrada" }, { status: 404 });
    }

    if (generation.user.clerkId !== clerkId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Already settled — return cached result
    if (generation.status === "COMPLETED") {
      return NextResponse.json({
        status: "COMPLETED",
        outputUrls: generation.outputUrls,
        generationId: generation.id,
      });
    }

    if (generation.status === "FAILED") {
      return NextResponse.json({
        status: "FAILED",
        error: generation.errorMessage,
        generationId: generation.id,
      });
    }

    if (!generation.falRequestId) {
      return NextResponse.json({ status: generation.status, generationId: generation.id });
    }

    // ── Sora 2 / OpenAI video polling ────────────────────────────────────────
    if (generation.model === "sora-2" || generation.model === "sora") {
      const openaiRes = await fetch(
        `https://api.openai.com/v1/video/generations/${generation.falRequestId}`,
        { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } }
      );
      if (!openaiRes.ok) {
        return NextResponse.json({ status: "PROCESSING", generationId: generation.id });
      }
      const vid = await openaiRes.json() as {
        status: string;
        result?: { data?: { url: string }[] };
        data?:   { url: string }[];
        error?:  { message?: string };
      };

      if (vid.status === "completed" || vid.status === "succeeded") {
        const videoUrl = vid.result?.data?.[0]?.url ?? vid.data?.[0]?.url ?? "";
        if (videoUrl) {
          await prisma.generation.update({
            where: { id: generation.id },
            data:  { status: "COMPLETED", outputUrls: [videoUrl] },
          });
          return NextResponse.json({ status: "COMPLETED", outputUrls: [videoUrl], generationId: generation.id });
        }
      }
      if (vid.status === "failed" || vid.status === "error") {
        const msg = vid.error?.message ?? "Falha na geração Sora";
        await refundCredits(generation.user.id, generation.creditsCost, `Reembolso: Sora falhou`);
        await prisma.generation.update({
          where: { id: generation.id },
          data:  { status: "FAILED", errorMessage: msg },
        });
        return NextResponse.json({ status: "FAILED", error: msg, generationId: generation.id });
      }
      // Still queued/processing
      return NextResponse.json({ status: "PROCESSING", generationId: generation.id });
    }

    // Resolve the FAL endpoint for this model
    const falModelId = getFalModelId(generation.model);
    if (!falModelId) {
      return NextResponse.json({ status: "FAILED", error: "Modelo desconhecido" });
    }

    const falStatus = await getFalJobStatus(falModelId, generation.falRequestId);

    if (falStatus.status === "COMPLETED") {
      const result = await getFalJobResult(falModelId, generation.falRequestId);
      const rawUrls = extractOutputUrls(result.data);

      // For images, attempt to archive to R2; for other media, use FAL URLs directly
      let outputUrls: string[] = rawUrls;
      if (generation.tool === "IMAGE_GENERATE" || generation.tool.startsWith("IMAGE_")) {
        try {
          outputUrls = await Promise.all(
            rawUrls.map((url, i) => saveImageFromUrl(url, generation.id, i))
          );
        } catch {
          outputUrls = rawUrls;
        }
      }

      await prisma.generation.update({
        where: { id: generation.id },
        data: { status: "COMPLETED", outputUrls },
      });

      return NextResponse.json({
        status: "COMPLETED",
        outputUrls,
        generationId: generation.id,
      });
    }

    if ((falStatus.status as string) === "FAILED") {
      await refundCredits(
        generation.user.id,
        generation.creditsCost,
        `Reembolso automático: falha na geração ${generation.id}`
      );
      await prisma.generation.update({
        where: { id: generation.id },
        data: { status: "FAILED", errorMessage: "Falha no processamento da IA" },
      });

      return NextResponse.json({
        status: "FAILED",
        error: "Falha no processamento. Créditos reembolsados.",
        generationId: generation.id,
      });
    }

    return NextResponse.json({
      status: falStatus.status === "IN_QUEUE" ? "PENDING" : "PROCESSING",
      generationId: generation.id,
    });
  } catch (error) {
    console.error("[GET /api/generate/[id]/status]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
