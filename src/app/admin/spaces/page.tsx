"use client";

import { useEffect, useState } from "react";
import { Box, RefreshCw, Users, Layers, Activity, LayoutGrid } from "lucide-react";

const PLAN_BADGE: Record<string, string> = {
  FREE:         "text-zinc-400 bg-zinc-400/10",
  ESSENTIAL:    "text-blue-400 bg-blue-400/10",
  PREMIUM:      "text-violet-400 bg-violet-400/10",
  PREMIUM_PLUS: "text-purple-400 bg-purple-400/10",
  PRO:          "text-amber-400 bg-amber-400/10",
};

interface TopSpace {
  id:                  string;
  name:                string;
  userEmail:           string;
  userName:            string | null;
  userPlan:            string;
  nodeCount:           number;
  edgeCount:           number;
  isEmpty:             boolean;
  createdAt:           string;
  updatedAt:           string;
  userGenerations:     number;
  userCreditsConsumed: number;
}

interface TopUser {
  userId:    string;
  userEmail: string;
  userName:  string | null;
  userPlan:  string;
  spaceCount: number;
}

interface DailyBucket {
  label: string;
  date:  string;
  count: number;
}

interface SpacesData {
  total:            number;
  today:            number;
  last7d:           number;
  last30d:          number;
  usersWithSpaces:  number;
  avgPerActiveUser: number;
  topSpaces:        TopSpace[];
  topUsersByCount:  TopUser[];
  dailyCreation:    DailyBucket[];
  note:             string;
  computedAt:       string;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

function elapsed(iso: string) {
  const ms  = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1)   return "agora";
  if (min < 60)  return `${min}min atrás`;
  const hr = Math.floor(min / 60);
  if (hr  < 24)  return `${hr}h atrás`;
  return `${Math.floor(hr / 24)}d atrás`;
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-5">
      <div className="flex items-center gap-2 text-zinc-400 mb-2">
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="text-3xl font-bold text-white">{value}</div>
      {sub && <div className="mt-2 text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-5 animate-pulse">
      <div className="w-24 h-3 bg-white/5 rounded mb-4" />
      <div className="w-32 h-7 bg-white/5 rounded mb-2" />
      <div className="w-20 h-2 bg-white/5 rounded" />
    </div>
  );
}

export default function SpacesPage() {
  const [data,    setData]    = useState<SpacesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/spaces");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const maxDaily = data
    ? Math.max(...data.dailyCreation.map((b) => b.count), 1)
    : 1;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Spaces</h1>
          <p className="text-zinc-400 text-sm mt-1">Canvases de trabalho por usuário — atividade e complexidade.</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white bg-white/5 border border-white/10 rounded-md px-3 py-1.5 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-rose-400 text-sm">{error}</div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : data ? (
          <>
            <KpiCard icon={Box}        label="Total Spaces"  value={data.total.toLocaleString("pt-BR")} />
            <KpiCard icon={Activity}   label="Hoje"          value={data.today} />
            <KpiCard icon={Activity}   label="Últimos 7d"    value={data.last7d} />
            <KpiCard icon={LayoutGrid} label="Últimos 30d"   value={data.last30d} />
            <KpiCard icon={Users}      label="Usuários Ativos" value={data.usersWithSpaces}
              sub={`${data.total} spaces no total`} />
            <KpiCard icon={Layers}     label="Média / Usuário" value={data.avgPerActiveUser}
              sub="spaces por usuário ativo" />
          </>
        ) : null}
      </div>

      {/* Note */}
      {data && (
        <div className="bg-amber-500/5 border border-amber-500/15 rounded-lg px-4 py-2.5 text-xs text-amber-400/70">
          {data.note}
        </div>
      )}

      {/* Daily creation + Top Users side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Daily creation bar chart */}
        <div className="bg-[#0a0a0a] border border-white/5 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5">
            <h2 className="text-sm font-medium text-white">Criação Diária — últimos 7 dias</h2>
          </div>
          {loading ? (
            <div className="px-6 py-6 animate-pulse space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-3 bg-white/5 rounded" />
              ))}
            </div>
          ) : data ? (
            <div className="px-6 py-5 flex items-end gap-3 h-44">
              {data.dailyCreation.map((b) => {
                const pct = Math.round((b.count / maxDaily) * 100);
                return (
                  <div key={b.date} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <span className="text-[10px] text-zinc-500 font-mono">{b.count}</span>
                    <div
                      className="w-full rounded-t bg-indigo-500/70 min-h-[2px] transition-all"
                      style={{ height: `${Math.max(pct, 1)}%` }}
                    />
                    <span className="text-[10px] text-zinc-600 capitalize">{b.label}</span>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* Top users by space count */}
        <div className="bg-[#0a0a0a] border border-white/5 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5">
            <h2 className="text-sm font-medium text-white">Top Usuários por Spaces</h2>
          </div>
          {loading ? (
            <div className="divide-y divide-white/5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-6 py-4 animate-pulse flex items-center gap-4">
                  <div className="w-6 h-3 bg-white/5 rounded" />
                  <div className="flex-1 space-y-2">
                    <div className="w-40 h-3 bg-white/5 rounded" />
                    <div className="w-24 h-2 bg-white/5 rounded" />
                  </div>
                  <div className="w-8 h-5 bg-white/5 rounded" />
                </div>
              ))}
            </div>
          ) : !data || data.topUsersByCount.length === 0 ? (
            <div className="px-6 py-10 text-center text-zinc-600 text-sm">Nenhum space registrado</div>
          ) : (
            <div className="divide-y divide-white/5">
              {data.topUsersByCount.map((u, i) => (
                <div key={u.userId} className="px-6 py-3 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
                  <span className="w-5 text-xs text-zinc-600 font-mono shrink-0">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-zinc-200 truncate">{u.userName ?? u.userEmail}</div>
                    <div className="text-xs text-zinc-600 truncate">{u.userEmail}</div>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ${PLAN_BADGE[u.userPlan] ?? "text-zinc-400 bg-zinc-400/10"}`}>
                    {u.userPlan}
                  </span>
                  <span className="text-sm font-bold text-indigo-400 shrink-0 w-8 text-right">
                    {u.spaceCount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top spaces table */}
      <div className="bg-[#0a0a0a] border border-white/5 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-medium text-white">Spaces Mais Recentes (por atividade)</h2>
          {data && (
            <span className="text-xs text-zinc-500">{data.topSpaces.length} exibidos</span>
          )}
        </div>

        {loading ? (
          <div className="divide-y divide-white/5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-6 py-4 animate-pulse flex items-center justify-between">
                <div className="space-y-2">
                  <div className="w-48 h-3 bg-white/5 rounded" />
                  <div className="w-64 h-2 bg-white/5 rounded" />
                </div>
                <div className="w-24 h-3 bg-white/5 rounded" />
              </div>
            ))}
          </div>
        ) : !data || data.topSpaces.length === 0 ? (
          <div className="px-6 py-12 text-center text-zinc-600 text-sm">Nenhum space registrado</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#121212] border-b border-white/5 text-xs uppercase text-zinc-500 font-medium">
                <tr>
                  <th className="px-6 py-3">Space</th>
                  <th className="px-6 py-3">Usuário</th>
                  <th className="px-6 py-3">Canvas</th>
                  <th className="px-6 py-3">Gens (user)</th>
                  <th className="px-6 py-3">Cr. consumidos (user)</th>
                  <th className="px-6 py-3 text-right">Última atividade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.topSpaces.map((s) => (
                  <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-zinc-200">{s.name}</div>
                      <div className="text-[10px] text-zinc-600 font-mono mt-0.5">{s.id}</div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-zinc-300 truncate max-w-[160px]">{s.userName ?? s.userEmail}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[9px] font-bold uppercase px-1 py-0.5 rounded ${PLAN_BADGE[s.userPlan] ?? "text-zinc-400 bg-zinc-400/10"}`}>
                          {s.userPlan}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {s.isEmpty ? (
                        <span className="text-xs text-zinc-600">vazio</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded border text-xs font-medium ${s.nodeCount > 50 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-white/5 text-zinc-300 border-white/5"}`}>
                            {s.nodeCount} nós
                          </span>
                          {s.edgeCount > 0 && (
                            <span className="text-[10px] text-zinc-600">{s.edgeCount} arestas</span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span className="text-zinc-300 font-mono text-xs">
                        {s.userGenerations.toLocaleString("pt-BR")}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className="text-zinc-300 font-mono text-xs">
                        {s.userCreditsConsumed.toLocaleString("pt-BR")} cr
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="text-zinc-400 text-xs">{elapsed(s.updatedAt)}</div>
                      <div className="text-[10px] text-zinc-600 mt-0.5">{fmtDate(s.updatedAt)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && (
        <div className="text-[10px] text-zinc-600 font-mono text-right">
          Atualizado: {new Date(data.computedAt).toLocaleString("pt-BR")}
        </div>
      )}
    </div>
  );
}
