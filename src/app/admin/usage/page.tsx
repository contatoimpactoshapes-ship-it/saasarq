"use client";

import { useEffect, useState } from "react";
import { Layers, Users, Box, Zap, RefreshCw } from "lucide-react";

interface ToolEntry {
  tool:    string;
  count:   number;
  percent: number;
}

interface UsageData {
  totalGenerations: number;
  generationsToday: number;
  generations7d:    number;
  generations30d:   number;
  activeUsers7d:    number;
  activeUsers30d:   number;
  totalUsers:       number;
  totalSpaces:      number;
  toolBreakdown:    ToolEntry[];
  hourlyDistribution: number[];
  computedAt:       string;
}

const TOOL_COLORS: string[] = [
  "bg-indigo-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-blue-500",
  "bg-pink-500",
  "bg-teal-500",
];

function formatTool(tool: string) {
  return tool.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function num(v: number) {
  return v.toLocaleString("pt-BR");
}

export default function UsagePage() {
  const [data,    setData]    = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/usage");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const maxHourly = data ? Math.max(...data.hourlyDistribution, 1) : 1;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Uso do Sistema</h1>
          <p className="text-zinc-400 text-sm mt-1">Engajamento, ferramentas e distribuição horária.</p>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-[#0a0a0a] border border-white/5 rounded-xl p-5 animate-pulse">
              <div className="w-20 h-3 bg-white/5 rounded mb-3" />
              <div className="w-28 h-6 bg-white/5 rounded" />
            </div>
          ))
        ) : data ? (
          <>
            <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-5">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <Zap className="w-4 h-4" />
                <span className="text-xs font-medium">Gerações Hoje</span>
              </div>
              <div className="text-2xl font-bold text-white">{num(data.generationsToday)}</div>
              <div className="text-xs text-zinc-500 mt-1">{num(data.generations7d)} nos últimos 7d</div>
            </div>

            <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-5">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <Users className="w-4 h-4" />
                <span className="text-xs font-medium">Usuários Ativos (7d)</span>
              </div>
              <div className="text-2xl font-bold text-white">{num(data.activeUsers7d)}</div>
              <div className="text-xs text-zinc-500 mt-1">{num(data.activeUsers30d)} nos últimos 30d</div>
            </div>

            <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-5">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <Box className="w-4 h-4" />
                <span className="text-xs font-medium">Espaços Criados</span>
              </div>
              <div className="text-2xl font-bold text-white">{num(data.totalSpaces)}</div>
              <div className="text-xs text-zinc-500 mt-1">de {num(data.totalUsers)} usuários</div>
            </div>

            <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-5">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <Layers className="w-4 h-4" />
                <span className="text-xs font-medium">Gerações (30d)</span>
              </div>
              <div className="text-2xl font-bold text-white">{num(data.generations30d)}</div>
              <div className="text-xs text-zinc-500 mt-1">{num(data.totalGenerations)} total histórico</div>
            </div>
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tool Breakdown */}
        <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6 text-white font-medium text-sm">
            <Zap className="w-4 h-4 text-indigo-400" />
            Ferramentas Mais Utilizadas
          </div>

          {loading ? (
            <div className="space-y-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse space-y-2">
                  <div className="flex justify-between">
                    <div className="w-32 h-3 bg-white/5 rounded" />
                    <div className="w-8 h-3 bg-white/5 rounded" />
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5" />
                </div>
              ))}
            </div>
          ) : !data || data.toolBreakdown.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm py-12">
              Nenhuma geração registrada
            </div>
          ) : (
            <div className="space-y-4">
              {data.toolBreakdown.slice(0, 8).map((entry, i) => (
                <div key={entry.tool}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-zinc-300 text-xs">{formatTool(entry.tool)}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 text-[10px] font-mono">{num(entry.count)}</span>
                      <span className="text-white font-medium text-xs w-10 text-right">{entry.percent}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5">
                    <div
                      className={`${TOOL_COLORS[i % TOOL_COLORS.length]} h-1.5 rounded-full transition-all duration-500`}
                      style={{ width: `${entry.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hourly Distribution */}
        <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-1 text-white font-medium text-sm">
            <Users className="w-4 h-4 text-violet-400" />
            Distribuição Horária
          </div>
          <div className="text-[10px] text-zinc-600 mb-5">últimos 7 dias</div>

          {loading ? (
            <div className="flex items-end gap-1 h-40 px-1">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="flex-1 bg-white/5 rounded-t-sm animate-pulse" style={{ height: `${30 + Math.random() * 70}%` }} />
              ))}
            </div>
          ) : !data ? null : (
            <>
              <div className="flex items-end gap-0.5 h-40 px-1">
                {data.hourlyDistribution.map((count, hour) => {
                  const pct = Math.round((count / maxHourly) * 100);
                  const isTop = count === maxHourly && count > 0;
                  return (
                    <div key={hour} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div
                        className={`w-full rounded-t-sm transition-all ${isTop ? "bg-violet-500" : "bg-white/10 group-hover:bg-violet-500/50"}`}
                        style={{ height: `${Math.max(2, pct)}%` }}
                      />
                      {/* Tooltip */}
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-zinc-800 border border-white/10 text-[9px] text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                        {count}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 px-1">
                {[0, 6, 12, 18, 23].map((h) => (
                  <span key={h} className="text-[9px] text-zinc-600">{h}h</span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {data && (
        <div className="text-[10px] text-zinc-600 font-mono text-right">
          Atualizado: {new Date(data.computedAt).toLocaleString("pt-BR")}
        </div>
      )}
    </div>
  );
}
