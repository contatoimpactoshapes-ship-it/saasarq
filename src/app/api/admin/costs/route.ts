import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, handleAdminError } from "@/lib/admin";
import { estimateCostUSD, getProvider, USD_BRL_RATE } from "@/lib/ai-costs";
import { getFalModelId } from "@/lib/model-lookup";

export const dynamic = "force-dynamic";

function computeBreakdown(rows: Array<{ model: string; tool: string; _count: { id: number } }>) {
  let total = 0;
  const breakdown = rows.map((r) => {
    const falId   = getFalModelId(r.model) ?? null;
    const costPer = estimateCostUSD(falId);
    const cost    = costPer * r._count.id;
    total += cost;
    return {
      model:    r.model,
      tool:     r.tool,
      provider: getProvider(falId ?? ""),
      count:    r._count.id,
      costUSD:  Math.round(cost * 100000) / 100000,
      costBRL:  Math.round(cost * USD_BRL_RATE * 100) / 100,
    };
  });
  breakdown.sort((a, b) => b.costUSD - a.costUSD);
  return { total: Math.round(total * 100) / 100, breakdown };
}

export async function GET() {
  try {
    await requireAdmin();

    const h24 = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const d7  = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000);
    const d30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [modelCounts24h, modelCounts7d, modelCounts30d, topUsersByDebit24h] =
      await Promise.all([
        prisma.generation.groupBy({
          by:    ["model", "tool"],
          where: { status: "COMPLETED", createdAt: { gte: h24 } },
          _count: { id: true },
        }),
        prisma.generation.groupBy({
          by:    ["model", "tool"],
          where: { status: "COMPLETED", createdAt: { gte: d7 } },
          _count: { id: true },
        }),
        prisma.generation.groupBy({
          by:    ["model", "tool"],
          where: { status: "COMPLETED", createdAt: { gte: d30 } },
          _count: { id: true },
        }),
        // Top users by credit spend in 24h (DEBIT stored negative, sum is negative → use _sum.amount asc)
        prisma.creditTransaction.groupBy({
          by:    ["userId"],
          where: { type: "DEBIT", createdAt: { gte: h24 } },
          _sum:  { amount: true },
          orderBy: { _sum: { amount: "asc" } },
          take:  10,
        }),
      ]);

    const result24h = computeBreakdown(modelCounts24h);
    const result7d  = computeBreakdown(modelCounts7d);
    const result30d = computeBreakdown(modelCounts30d);

    // Fetch user emails for top debit users
    const userIds = topUsersByDebit24h.map((u) => u.userId);
    const users   = await prisma.user.findMany({
      where:  { id: { in: userIds } },
      select: { id: true, email: true, plan: true },
    });
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const topUsers = topUsersByDebit24h.map((u) => ({
      userId:         u.userId,
      email:          userMap[u.userId]?.email ?? "?",
      plan:           userMap[u.userId]?.plan  ?? "?",
      creditsUsed24h: Math.abs(u._sum.amount ?? 0),
    }));

    return NextResponse.json({
      costs24h: {
        totalUSD: result24h.total,
        totalBRL: Math.round(result24h.total * USD_BRL_RATE * 100) / 100,
        byModel:  result24h.breakdown,
      },
      costs7d: {
        totalUSD: result7d.total,
        totalBRL: Math.round(result7d.total * USD_BRL_RATE * 100) / 100,
        byModel:  result7d.breakdown,
      },
      costs30d: {
        totalUSD: result30d.total,
        totalBRL: Math.round(result30d.total * USD_BRL_RATE * 100) / 100,
        byModel:  result30d.breakdown,
      },
      topExpensiveUsers24h: topUsers,
      usdBrlRate:  USD_BRL_RATE,
      costNote:    "Estimated costs based on public FAL.ai pricing — may differ from actual invoice",
      computedAt:  new Date().toISOString(),
    });
  } catch (err) {
    return handleAdminError(err);
  }
}
