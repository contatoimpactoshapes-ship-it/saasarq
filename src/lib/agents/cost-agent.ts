import { prisma } from "@/lib/prisma";
import { estimateCostUSD, USD_BRL_RATE } from "@/lib/ai-costs";
import { getFalModelId } from "@/lib/model-lookup";
import { AgentResult, Alert, Recommendation } from "./types";

// Alert when estimated daily cost exceeds this threshold (USD)
const DAILY_COST_WARNING_USD  = 50;
const DAILY_COST_CRITICAL_USD = 200;

export async function runCostAgent(): Promise<AgentResult> {
  const t0 = Date.now();
  const alerts: Alert[]             = [];
  const recommendations: Recommendation[] = [];

  const h24 = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const d7  = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000);

  const [modelCounts24h, modelCounts7d] = await Promise.all([
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
  ]);

  // Compute estimated USD cost per model for last 24h
  let totalCostUSD24h = 0;
  const costBreakdown: Array<{ model: string; tool: string; count: number; costUSD: number }> = [];

  for (const row of modelCounts24h) {
    const falId   = getFalModelId(row.model) ?? null;
    const costPer = estimateCostUSD(falId);
    const total   = costPer * row._count.id;
    totalCostUSD24h += total;
    costBreakdown.push({
      model:   row.model,
      tool:    row.tool,
      count:   row._count.id,
      costUSD: Math.round(total * 10000) / 10000,
    });
  }

  costBreakdown.sort((a, b) => b.costUSD - a.costUSD);

  // 7-day total
  let totalCostUSD7d = 0;
  for (const row of modelCounts7d) {
    const falId   = getFalModelId(row.model) ?? null;
    const costPer = estimateCostUSD(falId);
    totalCostUSD7d += costPer * row._count.id;
  }

  if (totalCostUSD24h >= DAILY_COST_CRITICAL_USD) {
    alerts.push({
      id:       "cost-critical",
      severity: "critical",
      title:    "Custo de inferência crítico (24h)",
      detail:   `Custo estimado de $${totalCostUSD24h.toFixed(2)} USD nas últimas 24h`,
      metric:   totalCostUSD24h,
    });
  } else if (totalCostUSD24h >= DAILY_COST_WARNING_USD) {
    alerts.push({
      id:       "cost-warning",
      severity: "warning",
      title:    "Custo de inferência elevado (24h)",
      detail:   `Custo estimado de $${totalCostUSD24h.toFixed(2)} USD nas últimas 24h`,
      metric:   totalCostUSD24h,
    });
  }

  const topCostModel = costBreakdown[0];
  if (topCostModel && totalCostUSD24h > 10) {
    recommendations.push({
      id:     "cost-optimization",
      title:  "Revisar uso do modelo mais custoso",
      detail: `"${topCostModel.model}" representa $${topCostModel.costUSD.toFixed(2)} USD (${Math.round((topCostModel.costUSD / totalCostUSD24h) * 100)}% do custo 24h).`,
      impact: "medium",
    });
  }

  const status =
    alerts.some((a) => a.severity === "critical") ? "critical" :
    alerts.some((a) => a.severity === "warning")  ? "warning"  :
    "ok";

  return {
    agentId:         "cost",
    status,
    alerts,
    recommendations,
    metrics: {
      totalCostUSD24h:  Math.round(totalCostUSD24h * 100)   / 100,
      totalCostBRL24h:  Math.round(totalCostUSD24h * USD_BRL_RATE * 100) / 100,
      totalCostUSD7d:   Math.round(totalCostUSD7d  * 100)   / 100,
      totalCostBRL7d:   Math.round(totalCostUSD7d  * USD_BRL_RATE * 100) / 100,
      topCostModel:     topCostModel?.model ?? "none",
      distinctModels24h: modelCounts24h.length,
    },
    runAt:      new Date().toISOString(),
    durationMs: Date.now() - t0,
  };
}
