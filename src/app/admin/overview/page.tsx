"use client";

import { useEffect, useState } from "react";
import { DollarSign, Users, Zap, Activity, TrendingUp, RefreshCw } from "lucide-react";
import { useAdminEvents } from "@/hooks/useAdminEvents";
import { LiveBadge } from "@/components/admin/LiveBadge";
import { LiveFeed, toFeedEntry, prependEntry, type FeedEntry } from "@/components/admin/LiveFeed";

interface StatsData {
  totalUsers:         number;
  newUsersToday:      number;
  newUsers7d:         number;
  newUsers30d:        number;
  activeUsers30d:     number;
  usersByPlan:        Record<string, number>;
  totalGenerations:   number;
  generations24h:     number;
  successRate:        number;
  creditsConsumed24h: number;
  creditsIssued30d:   number;
  stuckGenerations:   number;
  mrr:                number;
  computedAt:         string;
}

const PLAN_COLORS: Record<string, string> = {
  PRO:          "bg-indigo-500",
  PREMIUM_PLUS: "bg-violet-500",
  PREMIUM:      "bg-purple-500",
  ESSENTIAL:    "bg-emerald-500",
  FREE:         "bg-zinc-600",
};

function fmt(n: number) {
  return n.toLocaleString("pt-BR");
}

function fmtBRL(n: number) {
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function SkeletonCard() {
  return (
    <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-4 flex flex-col justify-between animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="w-8 h-8 rounded-lg bg-white/5" />
        <div className="w-12 h-4 rounded bg-white/5" />
      </div>
      <div>
        <div className="w-24 h-6 rounded bg-white/5 mb-2" />
        <div className="w-20 h-3 rounded bg-white/5" />
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const [data,    setData]    = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [live,    setLive]    = useState(false);
  const [feed,    setFeed]    = useState<FeedEntry[]>([]);

  useAdminEvents({
    onConnect:    () => setLive(true),
    onDisconnect: () => setLive(false),
    onEvent: (event) => {
      if (event.type === "generation:completed") {
        setData((prev) => prev ? { ...prev, generations24h: prev.generations24h + 1 } : prev);
      }
      const entry = toFeedEntry(event);
      if (entry) setFeed((prev) => prependEntry(prev, entry));
    },
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const totalPaidUsers = data
    ? Object.entries(data.usersByPlan)
        .filter(([p]) => p !== "FREE")
        .reduce((s, [, v]) => s + v, 0)
    : 0;

  const totalPlanUsers = data
    ? Object.values(data.usersByPlan).reduce((s, v) => s + v, 0)
    : 0;

  const kpis = data
    ? [
        { label: "MRR (estimado)", value: fmtBRL(data.mrr),           icon: TrendingUp  },
        { label: "Usuários Totais", value: fmt(data.totalUsers),       icon: Users       },
        { label: "Ativos 30d",      value: fmt(data.activeUsers30d),   icon: Activity    },
        { label: "Gerações 24h",    value: fmt(data.generations24h),   icon: Zap         },
        { label: "Créditos Consumidos 24h", value: fmt(data.creditsConsumed24h), icon: DollarSign },
        { label: "Taxa de Sucesso", value: `${data.successRate}%`,     icon: TrendingUp  },
      ]
    : null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Overview Executivo</h1>
          <p className="text-zinc-400 text-sm mt-1">Métricas chave e saúde financeira da plataforma.</p>
        </div>
        <div className="flex items-center gap-3">
          <LiveBadge live={live} eventCount={feed.length} />
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white bg-white/5 border border-white/10 rounded-md px-3 py-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>
      </div>

      <LiveFeed entries={feed} live={live} />

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-rose-400 text-sm">
          Erro ao carregar dados: {error}
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : kpis?.map((kpi, i) => (
            <div key={i} className="bg-[#0a0a0a] border border-white/5 rounded-xl p-4 flex flex-col justify-between hover:border-white/10 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                  <kpi.icon className="w-4 h-4 text-zinc-400" />
                </div>
              </div>
              <div>
                <div className="text-xl font-semibold text-white mb-1">{kpi.value}</div>
                <div className="text-xs text-zinc-500 font-medium">{kpi.label}</div>
              </div>
            </div>
          ))
        }
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Novos usuários por período */}
        <div className="col-span-2 bg-[#0a0a0a] border border-white/5 rounded-xl p-6 flex flex-col">
          <h2 className="text-lg font-medium text-white mb-6">Crescimento de Usuários</h2>
          {loading ? (
            <div className="flex-1 animate-pulse bg-white/5 rounded-lg" />
          ) : data ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1 content-start">
              {[
                { label: "Novos Hoje",  value: data.newUsersToday },
                { label: "Novos 7d",   value: data.newUsers7d },
                { label: "Novos 30d",  value: data.newUsers30d },
                { label: "Total",      value: data.totalUsers },
              ].map((item, i) => (
                <div key={i} className="bg-white/[0.03] border border-white/5 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-white font-mono">{fmt(item.value)}</div>
                  <div className="text-xs text-zinc-500 mt-1">{item.label}</div>
                </div>
              ))}
              <div className="col-span-2 sm:col-span-4 bg-white/[0.03] border border-white/5 rounded-lg p-4 flex items-center gap-6">
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Total de Gerações</div>
                  <div className="text-xl font-bold text-white font-mono">{fmt(data.totalGenerations)}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Jobs Travados</div>
                  <div className={`text-xl font-bold font-mono ${data.stuckGenerations > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                    {data.stuckGenerations}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Créditos Emitidos 30d</div>
                  <div className="text-xl font-bold text-white font-mono">{fmt(data.creditsIssued30d)}</div>
                </div>
              </div>
            </div>
          ) : null}
          {data && (
            <div className="text-[10px] text-zinc-600 mt-4 font-mono">
              Atualizado: {new Date(data.computedAt).toLocaleString("pt-BR")}
            </div>
          )}
        </div>

        {/* Distribuição de Planos */}
        <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-6 flex flex-col">
          <h2 className="text-lg font-medium text-white mb-6">Planos Ativos</h2>
          {loading ? (
            <div className="flex-1 space-y-3 animate-pulse">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 bg-white/5 rounded" />
              ))}
            </div>
          ) : data ? (
            <div className="flex-1 space-y-3">
              {Object.entries(data.usersByPlan)
                .sort(([, a], [, b]) => b - a)
                .map(([plan, count]) => {
                  const pct = totalPlanUsers > 0 ? Math.round((count / totalPlanUsers) * 100) : 0;
                  return (
                    <div key={plan}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${PLAN_COLORS[plan] ?? "bg-zinc-500"}`} />
                          <span className="text-zinc-300">{plan}</span>
                        </div>
                        <span className="text-white font-medium font-mono">{count} <span className="text-zinc-500 text-xs">({pct}%)</span></span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-1">
                        <div
                          className={`${PLAN_COLORS[plan] ?? "bg-zinc-500"} h-1 rounded-full transition-all duration-700`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              <div className="pt-3 border-t border-white/5 text-xs text-zinc-500 flex justify-between">
                <span>Pagantes</span>
                <span className="text-white font-medium">{fmt(totalPaidUsers)}</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
