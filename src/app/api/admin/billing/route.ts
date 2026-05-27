import { NextResponse } from "next/server";
import { prisma }       from "@/lib/prisma";
import { requireAdmin, handleAdminError } from "@/lib/admin";
import { CREDIT_PACKS } from "@/lib/economy/pricing";
import { PLANS }        from "@/lib/plans";

export const dynamic = "force-dynamic";

const MRR_BY_PLAN  = Object.fromEntries(PLANS.map((p) => [p.id, p.priceMonthly]));
const PACK_NAME_MAP = Object.fromEntries(CREDIT_PACKS.map((p) => [p.id, p.name]));

export async function GET() {
  try {
    await requireAdmin();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d7  = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000);
    const d30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      usersByPlanRaw,
      packAllTime,
      pack30d,
      pack7d,
      packToday,
      recentPurchases,
    ] = await Promise.all([
      prisma.user.groupBy({ by: ["plan"], _count: { plan: true } }),
      prisma.packPurchase.aggregate({ _sum: { amountPaidBRL: true }, _count: true }),
      prisma.packPurchase.aggregate({
        where:  { createdAt: { gte: d30 } },
        _sum:   { amountPaidBRL: true },
        _count: true,
      }),
      prisma.packPurchase.aggregate({
        where:  { createdAt: { gte: d7 } },
        _sum:   { amountPaidBRL: true },
        _count: true,
      }),
      prisma.packPurchase.aggregate({
        where:  { createdAt: { gte: today } },
        _sum:   { amountPaidBRL: true },
        _count: true,
      }),
      prisma.packPurchase.findMany({
        take:    30,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { email: true, name: true, plan: true } } },
      }),
    ]);

    const usersByPlan: Record<string, number> = {};
    for (const row of usersByPlanRaw) usersByPlan[row.plan] = row._count.plan;

    const mrr = Object.entries(usersByPlan).reduce<number>(
      (sum, [plan, count]) => sum + (MRR_BY_PLAN[plan] ?? 0) * count,
      0,
    );

    return NextResponse.json({
      mrr,
      arr:        mrr * 12,
      usersByPlan,
      packRevenue: {
        allTime:    packAllTime._sum.amountPaidBRL ?? 0,
        last30d:    pack30d._sum.amountPaidBRL ?? 0,
        last7d:     pack7d._sum.amountPaidBRL  ?? 0,
        today:      packToday._sum.amountPaidBRL ?? 0,
        count:      packAllTime._count,
        count30d:   pack30d._count,
        count7d:    pack7d._count,
        countToday: packToday._count,
      },
      recentPurchases: recentPurchases.map((p) => ({
        id:              p.id,
        userEmail:       p.user?.email      ?? "—",
        userName:        p.user?.name       ?? null,
        userPlan:        p.user?.plan       ?? "—",
        packId:          p.packId,
        packName:        PACK_NAME_MAP[p.packId] ?? p.packId,
        creditsTotal:    p.creditsAdded + p.bonusCredits,
        amountPaidBRL:   p.amountPaidBRL,
        stripeSessionId: p.stripeSessionId,
        createdAt:       p.createdAt.toISOString(),
      })),
      note:        "Pack purchases only. Stripe subscription payment intents are not stored in DB — MRR is estimated from plan × active users.",
      computedAt:  new Date().toISOString(),
    });
  } catch (err) {
    return handleAdminError(err);
  }
}
