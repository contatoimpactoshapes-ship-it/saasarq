import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, handleAdminError } from "@/lib/admin";
import { PLANS } from "@/lib/plans";

export const dynamic = "force-dynamic";

const MRR_BY_PLAN: Record<string, number> = Object.fromEntries(
  PLANS.map((p) => [p.id, p.priceMonthly])
);

const EMPTY_PLAN_COUNTS: Record<string, number> = Object.fromEntries(
  PLANS.map((p) => [p.id, 0])
);

export async function GET() {
  try {
    await requireAdmin();

    const d30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const d7  = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000);

    const [
      usersByPlanRaw,
      totalUsers,
      purchasesLast30d,
      purchasesLast7d,
      purchaseCountByType,
    ] = await Promise.all([
      prisma.user.groupBy({ by: ["plan"], _count: { plan: true } }),
      prisma.user.count(),
      prisma.creditTransaction.aggregate({
        where: { type: "PURCHASE", createdAt: { gte: d30 } },
        _sum:  { amount: true },
        _count: true,
      }),
      prisma.creditTransaction.aggregate({
        where: { type: "PURCHASE", createdAt: { gte: d7 } },
        _sum:  { amount: true },
        _count: true,
      }),
      prisma.creditTransaction.groupBy({
        by:    ["type"],
        _count: { type: true },
      }),
    ]);

    const usersByPlan = { ...EMPTY_PLAN_COUNTS };
    for (const row of usersByPlanRaw) {
      usersByPlan[row.plan] = row._count.plan;
    }

    const mrr = Object.entries(usersByPlan).reduce<number>((sum, [plan, count]) => {
      return sum + (MRR_BY_PLAN[plan] ?? 0) * count;
    }, 0);

    const arr             = mrr * 12;
    const paidUsers       = totalUsers - (usersByPlan["FREE"] ?? 0);
    const conversionRate  = totalUsers > 0
      ? Math.round((paidUsers / totalUsers) * 10000) / 100
      : 0;

    const creditsIssued30d = purchasesLast30d._sum.amount  ?? 0;
    const creditsIssued7d  = purchasesLast7d._sum.amount   ?? 0;
    const purchaseCount30d = purchasesLast30d._count;
    const purchaseCount7d  = purchasesLast7d._count;

    const getTypeCount = (type: string) =>
      purchaseCountByType.find((r) => r.type === type)?._count.type ?? 0;

    return NextResponse.json({
      mrr,
      arr,
      totalUsers,
      paidUsers,
      freeUsers:        usersByPlan["FREE"] ?? 0,
      conversionRate,
      usersByPlan,
      creditsIssued30d,
      creditsIssued7d,
      purchaseCount30d,
      purchaseCount7d,
      transactionTypes: {
        purchase: getTypeCount("PURCHASE"),
        debit:    getTypeCount("DEBIT"),
        refund:   getTypeCount("REFUND"),
        bonus:    getTypeCount("BONUS"),
      },
      // Upgrade/downgrade/churn tracking requires a plan change history table (not yet implemented)
      dataNote: "Upgrade/downgrade/churn tracking requires plan history — not yet available",
      computedAt: new Date().toISOString(),
    });
  } catch (err) {
    return handleAdminError(err);
  }
}
