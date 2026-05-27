import { NextResponse } from "next/server";
import { prisma }       from "@/lib/prisma";
import { requireAdmin, handleAdminError } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d7  = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000);
    const d30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      toolCountsRaw,
      totalGenerations,
      generationsToday,
      generations7d,
      generations30d,
      activeUsers7d,
      activeUsers30d,
      totalSpaces,
      totalUsers,
      last7dTimestamps,
    ] = await Promise.all([
      prisma.generation.groupBy({
        by:      ["tool"],
        _count:  { tool: true },
        orderBy: { _count: { tool: "desc" } },
      }),
      prisma.generation.count(),
      prisma.generation.count({ where: { createdAt: { gte: today } } }),
      prisma.generation.count({ where: { createdAt: { gte: d7   } } }),
      prisma.generation.count({ where: { createdAt: { gte: d30  } } }),
      prisma.user.count({
        where: { generations: { some: { createdAt: { gte: d7  } } } },
      }),
      prisma.user.count({
        where: { generations: { some: { createdAt: { gte: d30 } } } },
      }),
      prisma.space.count(),
      prisma.user.count(),
      // Timestamps for hourly distribution (last 7d) — minimal select
      prisma.generation.findMany({
        where:  { createdAt: { gte: d7 } },
        select: { createdAt: true },
      }),
    ]);

    // Hourly distribution [0..23] from last 7 days
    const hourlyDist = Array<number>(24).fill(0);
    for (const { createdAt } of last7dTimestamps) {
      hourlyDist[createdAt.getHours()]++;
    }

    // Tool breakdown with percentages
    const totalGenCount = toolCountsRaw.reduce((s, r) => s + r._count.tool, 0) || 1;
    const toolBreakdown = toolCountsRaw.map((r) => ({
      tool:    r.tool as string,
      count:   r._count.tool,
      percent: Math.round((r._count.tool / totalGenCount) * 1000) / 10,
    }));

    return NextResponse.json({
      totalGenerations,
      generationsToday,
      generations7d,
      generations30d,
      activeUsers7d,
      activeUsers30d,
      totalUsers,
      totalSpaces,
      toolBreakdown,
      hourlyDistribution: hourlyDist,
      computedAt: new Date().toISOString(),
    });
  } catch (err) {
    return handleAdminError(err);
  }
}
