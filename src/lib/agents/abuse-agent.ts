import { prisma } from "@/lib/prisma";
import { AgentResult, Alert, Recommendation } from "./types";

// Thresholds
const HIGH_VOLUME_24H  = 200;  // generations per user in 24h
const HIGH_FAILURE_RATE = 0.5; // 50%+ fail rate per user → likely abuse or bad integration
const CREDIT_DRAIN_24H  = 50000; // credits consumed by single user in 24h

export async function runAbuseAgent(): Promise<AgentResult> {
  const t0 = Date.now();
  const alerts: Alert[]             = [];
  const recommendations: Recommendation[] = [];

  const h24 = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const h1  = new Date(Date.now() -      60 * 60 * 1000);

  const [topUsersByVolume, recentFailedUsers, creditDrainUsers, lastHourCount] =
    await Promise.all([
      // Top users by generation count in 24h
      prisma.generation.groupBy({
        by:    ["userId"],
        where: { createdAt: { gte: h24 } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take:  10,
      }),
      // Users with failed rate > threshold in 24h (min 10 generations to avoid noise)
      prisma.generation.groupBy({
        by:    ["userId", "status"],
        where: { createdAt: { gte: h24 }, status: "FAILED" },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take:  10,
      }),
      // Users who consumed most credits in 24h
      prisma.creditTransaction.groupBy({
        by:    ["userId"],
        where: { type: "DEBIT", createdAt: { gte: h24 } },
        _sum:  { amount: true },
        orderBy: { _sum: { amount: "asc" } }, // DEBIT is negative, asc = most negative = highest drain
        take:  5,
      }),
      // Generation burst in last hour
      prisma.generation.count({ where: { createdAt: { gte: h1 } } }),
    ]);

  // High-volume users
  const highVolumeUsers = topUsersByVolume.filter((u) => u._count.id >= HIGH_VOLUME_24H);
  if (highVolumeUsers.length > 0) {
    alerts.push({
      id:       "high-volume-users",
      severity: "warning",
      title:    "Usuários com volume anormalmente alto",
      detail:   `${highVolumeUsers.length} usuário(s) com mais de ${HIGH_VOLUME_24H} gerações em 24h`,
      metric:   highVolumeUsers[0]._count.id,
    });
  }

  // Credit drain
  const heavyDrainers = creditDrainUsers.filter(
    (u) => Math.abs(u._sum.amount ?? 0) >= CREDIT_DRAIN_24H
  );
  if (heavyDrainers.length > 0) {
    alerts.push({
      id:       "credit-drain",
      severity: "warning",
      title:    "Consumo massivo de créditos em 24h",
      detail:   `${heavyDrainers.length} usuário(s) consumiram mais de ${CREDIT_DRAIN_24H} créditos em 24h`,
      metric:   Math.abs(heavyDrainers[0]._sum.amount ?? 0),
    });
  }

  // Burst in last hour
  if (lastHourCount > 500) {
    alerts.push({
      id:       "generation-burst",
      severity: "critical",
      title:    "Pico de gerações na última hora",
      detail:   `${lastHourCount} gerações na última hora — possível abuso ou spike de tráfego`,
      metric:   lastHourCount,
    });
  }

  if (highVolumeUsers.length > 0 || heavyDrainers.length > 0) {
    recommendations.push({
      id:     "rate-limit",
      title:  "Implementar rate limiting por usuário",
      detail: "Adicionar limite diário de gerações por plano para mitigar abuso.",
      impact: "high",
    });
  }

  const status =
    alerts.some((a) => a.severity === "critical") ? "critical" :
    alerts.some((a) => a.severity === "warning")  ? "warning"  :
    "ok";

  return {
    agentId:         "abuse",
    status,
    alerts,
    recommendations,
    metrics: {
      topUserMaxGenerations24h: topUsersByVolume[0]?._count.id ?? 0,
      highVolumeUsersCount:     highVolumeUsers.length,
      heavyDrainerCount:        heavyDrainers.length,
      lastHourGenerations:      lastHourCount,
      failedUserEntriesCount:   recentFailedUsers.length,
    },
    runAt:      new Date().toISOString(),
    durationMs: Date.now() - t0,
  };
}
