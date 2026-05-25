import { AgentResult } from "./types";
import { runRevenueAgent }        from "./revenue-agent";
import { runAbuseAgent }          from "./abuse-agent";
import { runCostAgent }           from "./cost-agent";
import { runInfrastructureAgent } from "./infrastructure-agent";
import { runArchitectAgent }      from "./architect-agent";

export type { AgentResult } from "./types";

export async function runAllAgents(): Promise<AgentResult[]> {
  const results = await Promise.allSettled([
    runRevenueAgent(),
    runAbuseAgent(),
    runCostAgent(),
    runInfrastructureAgent(),
    runArchitectAgent(),
  ]);

  return results.map((r, i): AgentResult => {
    if (r.status === "fulfilled") return r.value;
    const agentIds = ["revenue", "abuse", "cost", "infrastructure", "architect"];
    console.error(`[agent:${agentIds[i]}]`, r.reason);
    return {
      agentId:         agentIds[i],
      status:          "error",
      alerts:          [{ id: "agent-error", severity: "critical", title: "Falha no agente", detail: String(r.reason) }],
      recommendations: [],
      metrics:         {},
      runAt:           new Date().toISOString(),
      durationMs:      0,
    };
  });
}
