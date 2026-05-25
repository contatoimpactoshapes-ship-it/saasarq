import { prisma } from "@/lib/prisma";
import { AgentResult, Alert, Recommendation } from "./types";

const STUCK_THRESHOLD_MIN   = 30;
const STUCK_CRITICAL_COUNT  = 10;
const STUCK_WARNING_COUNT   = 3;
const FAILED_RATE_WARNING   = 0.20; // 20%
const FAILED_RATE_CRITICAL  = 0.40; // 40%
const PENDING_QUEUE_WARNING = 50;

export async function runInfrastructureAgent(): Promise<AgentResult> {
  const t0 = Date.now();
  const alerts: Alert[]             = [];
  const recommendations: Recommendation[] = [];

  const m30 = new Date(Date.now() - STUCK_THRESHOLD_MIN * 60 * 1000);
  const h2  = new Date(Date.now() - 2 * 60 * 60 * 1000);

  const [stuckCount, pendingCount, recentStatusCounts] = await Promise.all([
    prisma.generation.count({
      where: { status: "PROCESSING", updatedAt: { lte: m30 } },
    }),
    prisma.generation.count({ where: { status: "PENDING" } }),
    prisma.generation.groupBy({
      by:    ["status"],
      where: { createdAt: { gte: h2 } },
      _count: { status: true },
    }),
  ]);

  const getCount = (status: string) =>
    recentStatusCounts.find((s) => s.status === status)?._count.status ?? 0;

  const completed2h  = getCount("COMPLETED");
  const failed2h     = getCount("FAILED");
  const total2h      = completed2h + failed2h;
  const failedRate2h = total2h > 0 ? failed2h / total2h : 0;

  // Stuck generation alerts
  if (stuckCount >= STUCK_CRITICAL_COUNT) {
    alerts.push({
      id:       "stuck-critical",
      severity: "critical",
      title:    "Gerações travadas: crítico",
      detail:   `${stuckCount} gerações em PROCESSING por mais de ${STUCK_THRESHOLD_MIN}min`,
      metric:   stuckCount,
    });
  } else if (stuckCount >= STUCK_WARNING_COUNT) {
    alerts.push({
      id:       "stuck-warning",
      severity: "warning",
      title:    "Gerações travadas",
      detail:   `${stuckCount} gerações em PROCESSING por mais de ${STUCK_THRESHOLD_MIN}min`,
      metric:   stuckCount,
    });
  }

  // High failure rate
  if (failedRate2h >= FAILED_RATE_CRITICAL) {
    alerts.push({
      id:       "failed-rate-critical",
      severity: "critical",
      title:    "Taxa de falha crítica (2h)",
      detail:   `${Math.round(failedRate2h * 100)}% das gerações falharam nas últimas 2h`,
      metric:   Math.round(failedRate2h * 10000) / 100,
    });
  } else if (failedRate2h >= FAILED_RATE_WARNING) {
    alerts.push({
      id:       "failed-rate-warning",
      severity: "warning",
      title:    "Taxa de falha elevada (2h)",
      detail:   `${Math.round(failedRate2h * 100)}% das gerações falharam nas últimas 2h`,
      metric:   Math.round(failedRate2h * 10000) / 100,
    });
  }

  // Pending queue buildup
  if (pendingCount >= PENDING_QUEUE_WARNING) {
    alerts.push({
      id:       "pending-queue",
      severity: "warning",
      title:    "Fila de PENDING elevada",
      detail:   `${pendingCount} gerações aguardando processamento`,
      metric:   pendingCount,
    });
  }

  if (stuckCount > 0) {
    recommendations.push({
      id:     "cleanup-stuck",
      title:  "Limpar gerações travadas",
      detail: `Use a rota admin PATCH /api/admin/generations/cleanup-stuck para marcar as ${stuckCount} gerações travadas como FAILED.`,
      impact: "high",
    });
  }

  const status =
    alerts.some((a) => a.severity === "critical") ? "critical" :
    alerts.some((a) => a.severity === "warning")  ? "warning"  :
    "ok";

  return {
    agentId:         "infrastructure",
    status,
    alerts,
    recommendations,
    metrics: {
      stuckCount,
      pendingCount,
      failedRate2h:  Math.round(failedRate2h * 10000) / 100,
      completed2h,
      failed2h,
      total2h,
    },
    runAt:      new Date().toISOString(),
    durationMs: Date.now() - t0,
  };
}
