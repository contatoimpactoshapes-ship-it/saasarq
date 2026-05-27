"use client";

import { useEffect, useState } from "react";
import { Bot, BrainCircuit, Activity, ShieldAlert, ArrowUpCircle, AlertTriangle, TrendingUp, RefreshCw, CheckCircle2, XCircle, Zap } from "lucide-react";
import { useAdminEvents }  from "@/hooks/useAdminEvents";
import { LiveBadge }       from "@/components/admin/LiveBadge";
import { IncidentFeed, type IncidentCard } from "@/components/admin/IncidentFeed";
import type { IncidentStatus, Severity } from "@/lib/realtime/typed-events";

interface Alert {
  id:       string;
  severity: "critical" | "warning" | "info";
  title:    string;
  detail:   string;
  metric?:  string | number;
}

interface Recommendation {
  id:     string;
  title:  string;
  detail: string;
  impact: "high" | "medium" | "low";
}

interface AgentResult {
  agentId:         string;
  status:          "ok" | "warning" | "critical" | "error";
  alerts:          Alert[];
  recommendations: Recommendation[];
  metrics:         Record<string, number | string | boolean>;
  runAt:           string;
  durationMs:      number;
}

interface AgentsData {
  overallStatus:    "ok" | "warning" | "critical";
  summary: {
    criticalAlerts:  number;
    warningAlerts:   number;
    totalAlerts:     number;
    recommendations: number;
    agentsRun:       number;
  };
  agents:           AgentResult[];
  allAlerts:        Alert[];
  allRecommendations: Recommendation[];
  totalDurationMs:  number;
  computedAt:       string;
}

const AGENT_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  revenue:        { label: "Revenue Agent",        icon: TrendingUp   },
  abuse:          { label: "Abuse Agent",          icon: ShieldAlert  },
  cost:           { label: "Cost Agent",           icon: Activity     },
  infrastructure: { label: "Infrastructure Agent", icon: BrainCircuit },
  architect:      { label: "Architect Agent",      icon: Bot          },
};

const STATUS_BADGE: Record<string, string> = {
  ok:       "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  warning:  "text-amber-400 bg-amber-400/10 border-amber-400/20",
  critical: "text-rose-400 bg-rose-400/10 border-rose-400/20",
  error:    "text-rose-500 bg-rose-500/10 border-rose-500/20",
};

const SEVERITY_ICON: Record<string, React.ReactNode> = {
  critical: <XCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />,
  warning:  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />,
  info:     <ArrowUpCircle className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />,
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-rose-500/5 hover:bg-rose-500/10",
  warning:  "bg-amber-500/5 hover:bg-amber-500/10",
  info:     "bg-indigo-500/5 hover:bg-indigo-500/10",
};

export default function AgentsPage() {
  const [data,      setData]      = useState<AgentsData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [live,      setLive]      = useState(false);
  const [incidents, setIncidents] = useState<IncidentCard[]>([]);

  // Load static incident snapshot on mount
  useEffect(() => {
    fetch("/api/admin/incidents?all=true")
      .then((r) => r.ok ? r.json() : { incidents: [] })
      .then((d) => setIncidents(d.incidents ?? []))
      .catch(() => {});
  }, []);

  // Live incident updates via SSE
  useAdminEvents({
    onConnect:    () => setLive(true),
    onDisconnect: () => setLive(false),
    onEvent: (event) => {
      if (event.type === "incident:opened") {
        const card: IncidentCard = {
          id:           event.incidentId,
          incidentType: event.incidentType,
          severity:     event.severity as Severity,
          title:        event.title,
          detail:       event.detail,
          status:       event.status as IncidentStatus,
          openedAt:     event.openedAt,
        };
        setIncidents((prev) => {
          const without = prev.filter((i) => i.id !== card.id);
          return [card, ...without];
        });
      }
      if (event.type === "incident:updated" || event.type === "incident:resolved") {
        setIncidents((prev) =>
          prev.map((i) =>
            i.id === event.incidentId
              ? { ...i, status: event.status as IncidentStatus, detail: event.detail }
              : i,
          ),
        );
      }
    },
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/agents");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Intelligence &amp; Agents Hub</h1>
          <p className="text-zinc-500 text-sm mt-1">Diagnóstico automático, detecção de anomalias e recomendações.</p>
        </div>
        <div className="flex items-center gap-3">
          <LiveBadge live={live} />
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white bg-white/5 border border-white/10 rounded-md px-3 py-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Rodar agentes
          </button>
        </div>
      </div>

      {/* Overall Status */}
      {!loading && data && (
        <div className={`w-full border rounded-xl p-4 flex items-center gap-4 ${
          data.overallStatus === "ok"       ? "border-emerald-500/20 bg-emerald-500/5" :
          data.overallStatus === "warning"  ? "border-amber-500/20 bg-amber-500/5"    :
          "border-rose-500/20 bg-rose-500/5"
        }`}>
          {data.overallStatus === "ok"
            ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            : data.overallStatus === "warning"
            ? <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            : <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
          }
          <div className="flex-1">
            <div className={`font-bold text-sm ${
              data.overallStatus === "ok" ? "text-emerald-400" : data.overallStatus === "warning" ? "text-amber-400" : "text-rose-400"
            }`}>
              {data.overallStatus === "ok" ? "Todos os agentes OK" : data.overallStatus === "warning" ? "Alertas de Atenção" : "Alertas Críticos Detectados"}
            </div>
            <div className="text-xs text-zinc-500 mt-0.5">
              {data.summary.criticalAlerts} críticos · {data.summary.warningAlerts} avisos · {data.summary.recommendations} recomendações · {data.totalDurationMs}ms
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-rose-400 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-[#050505] border border-white/10 rounded-xl p-6 animate-pulse">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-lg bg-white/5" />
                  <div className="space-y-2">
                    <div className="w-24 h-3 bg-white/5 rounded" />
                    <div className="w-16 h-2 bg-white/5 rounded" />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-8 bg-white/5 rounded" />
                  <div className="h-8 bg-white/5 rounded" />
                </div>
              </div>
            ))
            : data?.agents.map((agent) => {
              const meta = AGENT_META[agent.agentId];
              const Icon = meta?.icon ?? Bot;
              const borderColor =
                agent.status === "ok"       ? "border-emerald-500/20 hover:border-emerald-500/30" :
                agent.status === "warning"  ? "border-amber-500/20 hover:border-amber-500/30"    :
                "border-rose-500/20 hover:border-rose-500/30";
              return (
                <div key={agent.agentId} className={`bg-[#050505] border rounded-xl p-6 relative overflow-hidden shadow-2xl transition-colors ${borderColor}`}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      <Icon className="w-6 h-6 text-zinc-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-wide">{meta?.label ?? agent.agentId}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {agent.status === "ok"
                          ? <><span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"/><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"/></span><span className="text-xs text-emerald-500/70 uppercase tracking-widest font-mono">OK</span></>
                          : agent.status === "warning"
                          ? <><Zap className="w-3 h-3 text-amber-500 animate-pulse"/><span className="text-xs text-amber-500/70 uppercase tracking-widest font-mono">Warning</span></>
                          : <><XCircle className="w-3 h-3 text-rose-500"/><span className="text-xs text-rose-500/70 uppercase tracking-widest font-mono">Critical</span></>
                        }
                      </div>
                    </div>
                    <span className={`ml-auto text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${STATUS_BADGE[agent.status]}`}>
                      {agent.alerts.length} alerta{agent.alerts.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(agent.metrics).slice(0, 2).map(([k, v]) => (
                      <div key={k} className="bg-[#0a0a0a] rounded p-2.5 border border-white/5 flex items-center justify-between text-xs">
                        <span className="text-zinc-500 capitalize">{k.replace(/([A-Z])/g, " $1").trim()}</span>
                        <span className="text-zinc-300 font-mono">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-[10px] text-zinc-700 mt-3 font-mono">{agent.durationMs}ms</div>
                </div>
              );
            })
          }
        </div>

        {/* Intelligence Feed */}
        <div className="bg-[#0a0a0a] border border-white/5 rounded-xl flex flex-col shadow-2xl">
          <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
            <Activity className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-medium text-white tracking-wide">Intelligence Feed</h2>
          </div>
          <div className="flex-1 divide-y divide-white/5 overflow-y-auto max-h-[500px]">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-4 animate-pulse space-y-2">
                  <div className="w-3/4 h-3 bg-white/5 rounded" />
                  <div className="w-full h-2 bg-white/5 rounded" />
                  <div className="w-1/2 h-2 bg-white/5 rounded" />
                </div>
              ))
              : !data || data.allAlerts.length === 0
              ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-5">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-3" />
                  <div className="text-sm text-zinc-400">Nenhum alerta ativo</div>
                  <div className="text-xs text-zinc-600 mt-1">Plataforma saudável</div>
                </div>
              )
              : data.allAlerts.map((alert) => (
                <div key={alert.id} className={`p-4 ${SEVERITY_COLORS[alert.severity]} transition-colors`}>
                  <div className="flex items-start gap-3">
                    {SEVERITY_ICON[alert.severity]}
                    <div>
                      <div className={`text-xs font-semibold uppercase tracking-widest mb-1 ${
                        alert.severity === "critical" ? "text-rose-500" : alert.severity === "warning" ? "text-amber-500" : "text-indigo-400"
                      }`}>
                        {alert.severity}
                      </div>
                      <div className="text-sm text-zinc-200 font-medium">{alert.title}</div>
                      <div className="text-xs text-zinc-500 mt-1">{alert.detail}</div>
                    </div>
                  </div>
                </div>
              ))
            }
          </div>

          {/* Recommendations */}
          {data && data.allRecommendations.length > 0 && (
            <>
              <div className="px-5 py-3 border-t border-white/5 bg-indigo-500/5">
                <div className="text-xs font-semibold text-indigo-400 uppercase tracking-widest">
                  {data.allRecommendations.length} Recomendações
                </div>
              </div>
              <div className="divide-y divide-white/5 overflow-y-auto max-h-[200px]">
                {data.allRecommendations.map((rec) => (
                  <div key={rec.id} className="p-4 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-start gap-3">
                      <ArrowUpCircle className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-sm text-zinc-200 font-medium">{rec.title}</div>
                        <div className="text-xs text-zinc-500 mt-1">{rec.detail}</div>
                        <div className={`text-[10px] uppercase tracking-widest mt-1 font-semibold ${
                          rec.impact === "high" ? "text-rose-400" : rec.impact === "medium" ? "text-amber-400" : "text-zinc-500"
                        }`}>
                          {rec.impact} impact
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Live Incident Feed */}
      <IncidentFeed incidents={incidents} live={live} />

      {data && (
        <div className="text-[10px] text-zinc-600 font-mono text-right">
          Atualizado: {new Date(data.computedAt).toLocaleString("pt-BR")}
        </div>
      )}
    </div>
  );
}
