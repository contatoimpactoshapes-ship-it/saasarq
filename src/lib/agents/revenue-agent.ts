import { prisma } from "@/lib/prisma";
import { PLANS } from "@/lib/plans";
import { AgentResult, Alert, Recommendation } from "./types";

const MRR_BY_PLAN: Record<string, number> = Object.fromEntries(
  PLANS.map((p) => [p.id, p.priceMonthly])
);

export async function runRevenueAgent(): Promise<AgentResult> {
  const t0 = Date.now();
  const alerts: Alert[]             = [];
  const recommendations: Recommendation[] = [];

  const d30  = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const d7   = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000);

  const [usersByPlanRaw, purchasesLast30d, purchasesLast7d, freeUsers, totalUsers] =
    await Promise.all([
      prisma.user.groupBy({ by: ["plan"], _count: { plan: true } }),
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
      prisma.user.count({ where: { plan: "FREE" } }),
      prisma.user.count(),
    ]);

  const planCounts = Object.fromEntries(usersByPlanRaw.map((r) => [r.plan, r._count.plan]));
  const mrr = Object.entries(planCounts).reduce<number>((sum, [plan, count]) => {
    return sum + (MRR_BY_PLAN[plan] ?? 0) * count;
  }, 0);

  const paidUsers    = totalUsers - (planCounts["FREE"] ?? 0);
  const conversionRate = totalUsers > 0
    ? Math.round((paidUsers / totalUsers) * 10000) / 100
    : 0;

  const creditsIssued30d = purchasesLast30d._sum.amount ?? 0;
  const creditsIssued7d  = purchasesLast7d._sum.amount  ?? 0;

  // Low conversion rate alert
  if (conversionRate < 5) {
    alerts.push({
      id:       "low-conversion",
      severity: "warning",
      title:    "Conversão de plano baixa",
      detail:   `${conversionRate}% dos usuários são pagantes`,
      metric:   conversionRate,
    });
  }

  // Zero MRR
  if (mrr === 0 && totalUsers > 10) {
    alerts.push({
      id:       "zero-mrr",
      severity: "critical",
      title:    "MRR zerado",
      detail:   "Nenhum usuário em plano pago com mais de 10 usuários",
    });
  }

  // High free user ratio
  const freeRatio = totalUsers > 0 ? freeUsers / totalUsers : 0;
  if (freeRatio > 0.9 && totalUsers > 20) {
    recommendations.push({
      id:     "improve-conversion",
      title:  "Otimizar funil de conversão",
      detail: `${Math.round(freeRatio * 100)}% dos usuários estão no plano gratuito. Considere melhorar o onboarding e ofertas de upgrade.`,
      impact: "high",
    });
  }

  const status =
    alerts.some((a) => a.severity === "critical") ? "critical" :
    alerts.some((a) => a.severity === "warning")  ? "warning"  :
    "ok";

  return {
    agentId:         "revenue",
    status,
    alerts,
    recommendations,
    metrics: {
      mrrBRL:           mrr,
      arrBRL:           mrr * 12,
      paidUsers,
      freeUsers,
      conversionRate,
      creditsIssued30d,
      creditsIssued7d,
      purchaseCount30d: purchasesLast30d._count,
    },
    runAt:      new Date().toISOString(),
    durationMs: Date.now() - t0,
  };
}
