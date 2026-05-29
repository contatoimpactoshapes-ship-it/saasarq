import { NextResponse } from "next/server";
import { prisma }       from "@/lib/prisma";
import { requireAdmin, handleAdminError } from "@/lib/admin";

export const dynamic = "force-dynamic";

function analyzeCanvas(raw: unknown): { nodeCount: number; edgeCount: number } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { nodeCount: 0, edgeCount: 0 };
  }
  const cd = raw as Record<string, unknown>;
  return {
    nodeCount: Array.isArray(cd.nodes) ? cd.nodes.length : 0,
    edgeCount: Array.isArray(cd.edges) ? cd.edges.length : 0,
  };
}

export async function GET() {
  try {
    await requireAdmin();

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const d7  = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000);
    const d30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // ── Batch 1: all counts + raw data ───────────────────────────────────────
    const [
      total,
      todayCount,
      last7dCount,
      last30dCount,
      usersWithSpaces,
      topSpacesRaw,
      last7dTimestamps,
      topUsersByCountRaw,
    ] = await Promise.all([
      prisma.space.count(),
      prisma.space.count({ where: { createdAt: { gte: todayDate } } }),
      prisma.space.count({ where: { createdAt: { gte: d7 } } }),
      prisma.space.count({ where: { createdAt: { gte: d30 } } }),
      prisma.user.count({ where: { spaces: { some: {} } } }),
      prisma.space.findMany({
        take:    20,
        orderBy: { updatedAt: "desc" },
        include: { user: { select: { email: true, name: true, plan: true } } },
      }),
      prisma.space.findMany({
        where:  { createdAt: { gte: d7 } },
        select: { createdAt: true },
      }),
      prisma.space.groupBy({
        by:      ["userId"],
        _count:  { id: true },
        orderBy: { _count: { id: "desc" } },
        take:    10,
      }),
    ]);

    // ── Batch 2: per-user metrics for top spaces + user details for top owners ─
    const spaceOwnerIds = Array.from(new Set(topSpacesRaw.map((s) => s.userId)));
    const topOwnerIds   = topUsersByCountRaw.map((r) => r.userId);

    const [genCountsRaw, creditSumsRaw, topOwnersData] = await Promise.all([
      prisma.generation.groupBy({
        by:    ["userId"],
        where: { userId: { in: spaceOwnerIds } },
        _count: { id: true },
      }),
      // DEBIT amounts are negative — Math.abs applied below
      prisma.creditTransaction.groupBy({
        by:    ["userId"],
        where: { userId: { in: spaceOwnerIds }, type: "DEBIT" },
        _sum:  { amount: true },
      }),
      prisma.user.findMany({
        where:  { id: { in: topOwnerIds } },
        select: { id: true, email: true, name: true, plan: true },
      }),
    ]);

    // ── Maps ─────────────────────────────────────────────────────────────────
    const genMap: Record<string, number> = {};
    for (const r of genCountsRaw) genMap[r.userId] = r._count.id;

    const creditMap: Record<string, number> = {};
    for (const r of creditSumsRaw) creditMap[r.userId] = Math.abs(r._sum.amount ?? 0);

    const ownerInfoMap: Record<string, { email: string; name: string | null; plan: string }> = {};
    for (const u of topOwnersData) ownerInfoMap[u.id] = { email: u.email, name: u.name, plan: u.plan };

    // ── Shape outputs ─────────────────────────────────────────────────────────
    const topSpaces = topSpacesRaw.map((s) => {
      const { nodeCount, edgeCount } = analyzeCanvas(s.canvasData);
      return {
        id:                   s.id,
        name:                 s.name,
        userEmail:            s.user?.email ?? "—",
        userName:             s.user?.name  ?? null,
        userPlan:             s.user?.plan  ?? "—",
        nodeCount,
        edgeCount,
        isEmpty:              nodeCount === 0 && edgeCount === 0,
        createdAt:            s.createdAt.toISOString(),
        updatedAt:            s.updatedAt.toISOString(),
        userGenerations:      genMap[s.userId]    ?? 0,
        userCreditsConsumed:  creditMap[s.userId] ?? 0,
      };
    });

    const topUsersByCount = topUsersByCountRaw.map((r) => ({
      userId:     r.userId,
      userEmail:  ownerInfoMap[r.userId]?.email ?? "—",
      userName:   ownerInfoMap[r.userId]?.name  ?? null,
      userPlan:   ownerInfoMap[r.userId]?.plan  ?? "—",
      spaceCount: r._count.id,
    }));

    // ── Daily creation (last 7 days) ─────────────────────────────────────────
    const dailyMap: Record<string, number> = {};
    for (const { createdAt } of last7dTimestamps) {
      const key = createdAt.toISOString().slice(0, 10);
      dailyMap[key] = (dailyMap[key] ?? 0) + 1;
    }

    const dailyCreation = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      return {
        label: d.toLocaleDateString("pt-BR", { weekday: "short" }),
        date:  key,
        count: dailyMap[key] ?? 0,
      };
    });

    return NextResponse.json({
      total,
      today:            todayCount,
      last7d:           last7dCount,
      last30d:          last30dCount,
      usersWithSpaces,
      avgPerActiveUser: usersWithSpaces > 0
        ? Math.round((total / usersWithSpaces) * 10) / 10
        : 0,
      topSpaces,
      topUsersByCount,
      dailyCreation,
      note: "userGenerations e userCreditsConsumed são métricas do usuário dono do space — Space não tem relação direta com Generation no schema atual.",
      computedAt: new Date().toISOString(),
    });
  } catch (err) {
    return handleAdminError(err);
  }
}
