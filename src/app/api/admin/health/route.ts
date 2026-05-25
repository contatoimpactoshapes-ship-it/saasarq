import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, handleAdminError } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();

    const now    = new Date();
    const m30ago = new Date(now.getTime() - 30 * 60 * 1000);
    const h2ago  = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    const [
      stuckGenerations,
      recentStatusCounts,
      pendingCount,
      processingCount,
    ] = await Promise.all([
      // Stuck: PROCESSING but not updated in the last 30 minutes
      prisma.generation.findMany({
        where: {
          status:    "PROCESSING",
          updatedAt: { lte: m30ago },
        },
        select: {
          id:           true,
          model:        true,
          tool:         true,
          falRequestId: true,
          createdAt:    true,
          updatedAt:    true,
          user: { select: { id: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
        take: 50,
      }),
      // Status breakdown for the last 2 hours
      prisma.generation.groupBy({
        by:    ["status"],
        _count: { status: true },
        where: { createdAt: { gte: h2ago } },
      }),
      prisma.generation.count({ where: { status: "PENDING" } }),
      prisma.generation.count({ where: { status: "PROCESSING" } }),
    ]);

    // Failed rate over the last 2-hour window
    const recentCompleted = recentStatusCounts.find((s) => s.status === "COMPLETED")?._count.status ?? 0;
    const recentFailed    = recentStatusCounts.find((s) => s.status === "FAILED")?._count.status    ?? 0;
    const recentPending   = recentStatusCounts.find((s) => s.status === "PENDING")?._count.status   ?? 0;
    const recentProcessing = recentStatusCounts.find((s) => s.status === "PROCESSING")?._count.status ?? 0;
    const recentTotal     = recentCompleted + recentFailed + recentPending + recentProcessing;

    const failedRate2h = recentTotal > 0
      ? Math.round((recentFailed / recentTotal) * 10000) / 100
      : 0;

    return NextResponse.json({
      stuckCount:      stuckGenerations.length,
      stuckGenerations,
      pendingCount,
      processingCount,
      failedRate2h,
      recentWindow: {
        hours:      2,
        total:      recentTotal,
        completed:  recentCompleted,
        failed:     recentFailed,
        pending:    recentPending,
        processing: recentProcessing,
      },
      timestamp: now.toISOString(),
    });
  } catch (err) {
    return handleAdminError(err);
  }
}
