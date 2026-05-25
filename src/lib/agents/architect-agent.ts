import { prisma } from "@/lib/prisma";
import { AgentResult, Alert, Recommendation } from "./types";

// Heuristics for platform health
const LOW_ACTIVE_RATE_THRESHOLD  = 0.10; // < 10% of users active in 30d
const HIGH_CREDITS_WASTE         = 0.30; // > 30% PENDING/PROCESSING never completing

export async function runArchitectAgent(): Promise<AgentResult> {
  const t0 = Date.now();
  const alerts: Alert[]             = [];
  const recommendations: Recommendation[] = [];

  const d30  = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const d7   = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    activeUsers30d,
    newUsers7d,
    statusCounts,
    spacesCount,
    projectsCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: { generations: { some: { createdAt: { gte: d30 } } } },
    }),
    prisma.user.count({ where: { createdAt: { gte: d7 } } }),
    prisma.generation.groupBy({ by: ["status"], _count: { status: true } }),
    prisma.space.count(),
    prisma.project.count(),
  ]);

  const getCount = (s: string) =>
    statusCounts.find((r) => r.status === s)?._count.status ?? 0;

  const completed  = getCount("COMPLETED");
  const failed     = getCount("FAILED");
  const pending    = getCount("PENDING");
  const processing = getCount("PROCESSING");
  const total      = completed + failed + pending + processing;
  const successRate = (completed + failed) > 0
    ? Math.round((completed / (completed + failed)) * 10000) / 100
    : 100;

  // Low platform engagement
  const activeRate = totalUsers > 0 ? activeUsers30d / totalUsers : 0;
  if (activeRate < LOW_ACTIVE_RATE_THRESHOLD && totalUsers > 50) {
    alerts.push({
      id:       "low-engagement",
      severity: "warning",
      title:    "Engajamento da plataforma baixo",
      detail:   `Apenas ${Math.round(activeRate * 100)}% dos usuários geraram conteúdo nos últimos 30 dias`,
      metric:   Math.round(activeRate * 10000) / 100,
    });
    recommendations.push({
      id:     "improve-engagement",
      title:  "Melhorar retenção e onboarding",
      detail: "Considere emails de reengajamento, tutoriais in-app e notificações de novos modelos.",
      impact: "high",
    });
  }

  // Overall success rate warning
  if (successRate < 70 && (completed + failed) > 100) {
    alerts.push({
      id:       "low-success-rate",
      severity: "warning",
      title:    "Taxa de sucesso global abaixo do ideal",
      detail:   `${successRate}% de sucesso nas gerações completadas/falhadas`,
      metric:   successRate,
    });
  }

  // Credit waste: high ratio of non-terminal statuses suggests stuck pipeline
  const nonTerminal = pending + processing;
  const wasteRate   = total > 0 ? nonTerminal / total : 0;
  if (wasteRate > HIGH_CREDITS_WASTE && nonTerminal > 20) {
    alerts.push({
      id:       "credits-waste",
      severity: "warning",
      title:    "Alto volume de gerações não-terminadas",
      detail:   `${nonTerminal} gerações (${Math.round(wasteRate * 100)}% do total) ainda em PENDING/PROCESSING`,
      metric:   nonTerminal,
    });
  }

  // Positive: growing users
  if (newUsers7d > 10) {
    recommendations.push({
      id:     "growth-momentum",
      title:  "Bom crescimento de usuários esta semana",
      detail: `${newUsers7d} novos usuários em 7 dias. Considere campanhas de conversão enquanto o engajamento é alto.`,
      impact: "medium",
    });
  }

  const status =
    alerts.some((a) => a.severity === "critical") ? "critical" :
    alerts.some((a) => a.severity === "warning")  ? "warning"  :
    "ok";

  return {
    agentId:         "architect",
    status,
    alerts,
    recommendations,
    metrics: {
      totalUsers,
      activeUsers30d,
      activeRate:   Math.round(activeRate * 10000) / 100,
      newUsers7d,
      successRate,
      totalGenerations: total,
      spacesCount,
      projectsCount,
    },
    runAt:      new Date().toISOString(),
    durationMs: Date.now() - t0,
  };
}
