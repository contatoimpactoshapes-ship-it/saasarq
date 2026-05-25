import { NextResponse } from "next/server";
import { requireAdmin, handleAdminError } from "@/lib/admin";
import { runAllAgents } from "@/lib/agents";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();

    const t0      = Date.now();
    const results = await runAllAgents();

    const overallStatus =
      results.some((r) => r.status === "critical" || r.status === "error") ? "critical" :
      results.some((r) => r.status === "warning")                          ? "warning"  :
      "ok";

    const allAlerts          = results.flatMap((r) => r.alerts);
    const allRecommendations = results.flatMap((r) => r.recommendations);

    const criticalCount = allAlerts.filter((a) => a.severity === "critical").length;
    const warningCount  = allAlerts.filter((a) => a.severity === "warning").length;

    return NextResponse.json({
      overallStatus,
      summary: {
        criticalAlerts:    criticalCount,
        warningAlerts:     warningCount,
        totalAlerts:       allAlerts.length,
        recommendations:   allRecommendations.length,
        agentsRun:         results.length,
      },
      agents:          results,
      allAlerts,
      allRecommendations,
      totalDurationMs: Date.now() - t0,
      computedAt:      new Date().toISOString(),
    });
  } catch (err) {
    return handleAdminError(err);
  }
}
