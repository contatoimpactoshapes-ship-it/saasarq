import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, handleAdminError } from "@/lib/admin";
import { PLANS } from "@/lib/plans";

export const dynamic = "force-dynamic";

// BRL monthly price per plan — used for MRR estimate
const MRR_BY_PLAN: Record<string, number> = Object.fromEntries(
  PLANS.map((p) => [p.id, p.priceMonthly])
);

// All plan keys initialised to 0 so the response shape is always complete
const EMPTY_PLAN_COUNTS: Record<string, number> = Object.fromEntries(
  PLANS.map((p) => [p.id, 0])
);

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

export async function GET() {
  try {
    await requireAdmin();

    const now  = new Date();
    const d1   = startOfToday();
    const d7   = daysAgo(7);
    const d30  = daysAgo(30);
    const h24  = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const m30  = new Date(now.getTime() - 30 * 60 * 1000);

    const [
      totalUsers,
      newUsersToday,
      newUsers7d,
      newUsers30d,
      activeUsers30d,
      usersByPlanRaw,
      totalGenerations,
      generations24h,
      statusCounts,
      consumedAgg,
      issuedAgg,
      stuckCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: d1 } } }),
      prisma.user.count({ where: { createdAt: { gte: d7 } } }),
      prisma.user.count({ where: { createdAt: { gte: d30 } } }),
      // Users who ran at least one generation in the last 30 days
      prisma.user.count({
        where: { generations: { some: { createdAt: { gte: d30 } } } },
      }),
      prisma.user.groupBy({ by: ["plan"], _count: { plan: true } }),
      prisma.generation.count(),
      prisma.generation.count({ where: { createdAt: { gte: h24 } } }),
      prisma.generation.groupBy({ by: ["status"], _count: { status: true } }),
      // DEBIT amounts are stored as negative integers — take Math.abs below
      prisma.creditTransaction.aggregate({
        where: { type: "DEBIT", createdAt: { gte: h24 } },
        _sum:  { amount: true },
      }),
      prisma.creditTransaction.aggregate({
        where: { type: "PURCHASE", createdAt: { gte: d30 } },
        _sum:  { amount: true },
      }),
      prisma.generation.count({
        where: { status: "PROCESSING", updatedAt: { lte: m30 } },
      }),
    ]);

    // Normalise plan counts — ensure every plan key is present even at 0
    const usersByPlan = { ...EMPTY_PLAN_COUNTS };
    for (const row of usersByPlanRaw) {
      usersByPlan[row.plan] = row._count.plan;
    }

    // Success rate (%) over all time — rounded to 2 decimal places
    const completed  = statusCounts.find((s) => s.status === "COMPLETED")?._count.status ?? 0;
    const failed     = statusCounts.find((s) => s.status === "FAILED")?._count.status    ?? 0;
    const successRate = (completed + failed) > 0
      ? Math.round((completed / (completed + failed)) * 10000) / 100
      : 100;

    // DEBIT amounts are stored negative; expose as positive "consumed" value
    const creditsConsumed24h = Math.abs(consumedAgg._sum.amount ?? 0);
    const creditsIssued30d   = issuedAgg._sum.amount ?? 0;

    // MRR estimate: sum of priceMonthly × users per plan
    // Note: includes FREE (price=0) and non-Stripe-verified plans — label as estimate
    const mrr = Object.entries(usersByPlan).reduce<number>((sum, [plan, count]) => {
      return sum + (MRR_BY_PLAN[plan] ?? 0) * count;
    }, 0);

    return NextResponse.json({
      totalUsers,
      newUsersToday,
      newUsers7d,
      newUsers30d,
      activeUsers30d,
      usersByPlan,
      totalGenerations,
      generations24h,
      successRate,
      creditsConsumed24h,
      creditsIssued30d,
      stuckGenerations: stuckCount,
      mrr,
      computedAt: now.toISOString(),
    });
  } catch (err) {
    return handleAdminError(err);
  }
}
