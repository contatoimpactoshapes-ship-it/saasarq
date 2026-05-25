import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, handleAdminError } from "@/lib/admin";
import { getFalModelId }    from "@/lib/model-lookup";
import { estimateCostUSD, getProvider } from "@/lib/ai-costs";

export const dynamic = "force-dynamic";

const VALID_STATUSES = ["PENDING", "PROCESSING", "COMPLETED", "FAILED"] as const;
const VALID_TOOLS    = ["IMAGE_GENERATE", "RENDER", "VIDEO_GENERATE", "TTS", "INPAINT"] as const;

const querySchema = z.object({
  limit:      z.coerce.number().int().min(1).max(100).default(20),
  cursor:     z.string().optional(),
  status:     z.enum(VALID_STATUSES).optional(),
  tool:       z.enum(VALID_TOOLS).optional(),
  model:      z.string().trim().max(100).optional(),
  userId:     z.string().trim().max(100).optional(),
  dateFrom:   z.string().optional(),
  dateTo:     z.string().optional(),
  failedOnly: z.enum(["true", "false"]).optional(),
  stuckOnly:  z.enum(["true", "false"]).optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const raw    = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = querySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Query inválida", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { limit, cursor, status, tool, model, userId, dateFrom, dateTo, failedOnly, stuckOnly } =
      parsed.data;

    const m30ago = new Date(Date.now() - 30 * 60 * 1000);

    const where: Record<string, unknown> = {};
    if (status)               where.status = status;
    if (tool)                 where.tool   = tool;
    if (model)                where.model  = model;
    if (userId)               where.userId = userId;
    if (failedOnly === "true") where.status = "FAILED";
    if (stuckOnly  === "true") {
      where.status    = "PROCESSING";
      where.updatedAt = { lte: m30ago };
    }
    if (dateFrom || dateTo) {
      const createdAt: Record<string, Date> = {};
      if (dateFrom) createdAt.gte = new Date(dateFrom);
      if (dateTo)   createdAt.lte = new Date(dateTo);
      where.createdAt = createdAt;
    }

    const generations = await prisma.generation.findMany({
      where,
      select: {
        id:           true,
        tool:         true,
        model:        true,
        prompt:       true,
        status:       true,
        creditsCost:  true,
        outputUrls:   true,
        errorMessage: true,
        falRequestId: true,
        createdAt:    true,
        updatedAt:    true,
        user: { select: { id: true, email: true, plan: true } },
      },
      orderBy: { createdAt: "desc" },
      take:    limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore  = generations.length > limit;
    const items    = hasMore ? generations.slice(0, limit) : generations;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    // Enrich each generation with computed fields
    const enriched = items.map((g) => {
      const falId         = getFalModelId(g.model) ?? null;
      const estimatedCostUSD = estimateCostUSD(falId);
      const provider      = getProvider(falId ?? "");
      const latencyMs     =
        g.status === "COMPLETED" || g.status === "FAILED"
          ? g.updatedAt.getTime() - g.createdAt.getTime()
          : null;

      return {
        ...g,
        estimatedCostUSD: Math.round(estimatedCostUSD * 100000) / 100000,
        provider,
        latencyMs,
        latencySeconds: latencyMs !== null ? Math.round(latencyMs / 100) / 10 : null,
      };
    });

    return NextResponse.json({ generations: enriched, nextCursor, hasMore });
  } catch (err) {
    return handleAdminError(err);
  }
}
