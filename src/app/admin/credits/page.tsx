"use client";

import { useEffect, useState } from "react";
import { Coins, Flame, TrendingUp, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

interface TopConsumer {
  userId:   string;
  email:    string;
  name:     string | null;
  plan:     string;
  consumed: number;
}

interface Transaction {
  id:          string;
  userId:      string;
  userEmail:   string;
  userName:    string | null;
  amount:      number;
  type:        string;
  description: string | null;
  createdAt:   string;
}

interface Pagination {
  page:       number;
  perPage:    number;
  total:      number;
  totalPages: number;
}

interface CreditsData {
  totalCreditsInCirculation: number;
  burnRate24h:               number;
  issued30d:                 number;
  topConsumers:              TopConsumer[];
  transactions:              Transaction[];
  pagination:                Pagination;
  computedAt:                string;
}

function num(v: number) {
  return v.toLocaleString("pt-BR");
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

const TX_TYPE_STYLE: Record<string, string> = {
  PURCHASE: "text-emerald-400 bg-emerald-500/10",
  DEBIT:    "text-zinc-400 bg-white/5",
  REFUND:   "text-blue-400 bg-blue-500/10",
  BONUS:    "text-violet-400 bg-violet-500/10",
};

const PLAN_LABEL: Record<string, string> = {
  FREE: "Free", ESSENTIAL: "Essential", PREMIUM: "Premium",
  PREMIUM_PLUS: "Premium+", PRO: "Pro",
};

export default function CreditsPage() {
  const [data,    setData]    = useState<CreditsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [page,    setPage]    = useState(1);

  async function load(p = page) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/credits?page=${p}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(page); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Ledger de Créditos</h1>
          <p className="text-zinc-400 text-sm mt-1">Circulação, burn rate e movimentação de créditos.</p>
        </div>
        <button
          onClick={() => load(page)}
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar — KPIs + Top Consumers */}
        <div className="lg:col-span-1 space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-[#0a0a0a] border border-white/5 rounded-xl p-5 animate-pulse">
                <div className="w-24 h-3 bg-white/5 rounded mb-4" />
                <div className="w-32 h-7 bg-white/5 rounded" />
              </div>
            ))
          ) : data ? (
            <>
              <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-5">
                <h3 className="text-xs font-medium text-zinc-400 mb-3 flex items-center gap-2">
                  <Coins className="w-3.5 h-3.5" /> Em Circulação
                </h3>
                <div className="text-2xl font-bold text-white">{num(data.totalCreditsInCirculation)}</div>
                <div className="text-xs text-zinc-500 mt-1">créditos disponíveis</div>
              </div>

              <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-5">
                <h3 className="text-xs font-medium text-zinc-400 mb-3 flex items-center gap-2">
                  <Flame className="w-3.5 h-3.5" /> Burn Rate (24h)
                </h3>
                <div className="text-2xl font-bold text-rose-400">-{num(data.burnRate24h)}</div>
                <div className="text-xs text-zinc-500 mt-1">consumidos hoje</div>
              </div>

              <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-5">
                <h3 className="text-xs font-medium text-zinc-400 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5" /> Emitidos (30d)
                </h3>
                <div className="text-2xl font-bold text-emerald-400">+{num(data.issued30d)}</div>
                <div className="text-xs text-zinc-500 mt-1">via pack purchases</div>
              </div>

              {data.topConsumers.length > 0 && (
                <div className="bg-[#0a0a0a] border border-white/5 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/5">
                    <span className="text-xs font-medium text-zinc-400">Top Consumidores (30d)</span>
                  </div>
                  <div className="divide-y divide-white/5">
                    {data.topConsumers.map((c, i) => (
                      <div key={c.userId} className="px-4 py-2.5 flex items-center gap-2">
                        <span className="text-[10px] font-bold text-zinc-600 w-4">{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-zinc-300 truncate">{c.email}</div>
                          <div className="text-[10px] text-zinc-600">{PLAN_LABEL[c.plan] ?? c.plan}</div>
                        </div>
                        <span className="text-xs font-mono text-rose-400 shrink-0">{num(c.consumed)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Transaction Log */}
        <div className="lg:col-span-3 bg-[#0a0a0a] border border-white/5 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-sm font-medium text-white">Log de Transações</h2>
            {data && (
              <span className="text-xs text-zinc-500">
                {data.pagination.total.toLocaleString("pt-BR")} transações
              </span>
            )}
          </div>

          {loading ? (
            <div className="divide-y divide-white/5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="px-6 py-4 animate-pulse flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="w-40 h-3 bg-white/5 rounded" />
                    <div className="w-56 h-2 bg-white/5 rounded" />
                  </div>
                  <div className="w-20 h-3 bg-white/5 rounded" />
                </div>
              ))}
            </div>
          ) : !data || data.transactions.length === 0 ? (
            <div className="px-6 py-12 text-center text-zinc-600 text-sm">Nenhuma transação encontrada</div>
          ) : (
            <>
              <div className="divide-y divide-white/5">
                {data.transactions.map((tx) => (
                  <div key={tx.id} className="px-6 py-3.5 flex items-center justify-between hover:bg-white/[0.02] transition-colors gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-zinc-200 truncate">{tx.userEmail}</span>
                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${TX_TYPE_STYLE[tx.type] ?? "text-zinc-400 bg-white/5"}`}>
                          {tx.type}
                        </span>
                      </div>
                      {tx.description && (
                        <div className="text-xs text-zinc-600 mt-0.5 truncate">{tx.description}</div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`font-mono text-sm font-semibold ${tx.amount >= 0 ? "text-emerald-400" : "text-zinc-400"}`}>
                        {tx.amount >= 0 ? "+" : ""}{num(tx.amount)}
                      </div>
                      <div className="text-[10px] text-zinc-600 mt-0.5">{fmtDate(tx.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {data.pagination.totalPages > 1 && (
                <div className="px-6 py-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-xs text-zinc-500">
                    Pág. {data.pagination.page} / {data.pagination.totalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="p-1 rounded hover:bg-white/5 disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4 text-zinc-400" />
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                      disabled={page >= data.pagination.totalPages}
                      className="p-1 rounded hover:bg-white/5 disabled:opacity-30 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 text-zinc-400" />
                    </button>
                  </div>
                </div>
              )}
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
