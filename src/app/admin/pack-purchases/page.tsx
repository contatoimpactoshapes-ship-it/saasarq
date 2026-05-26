"use client";

import { useEffect, useState } from "react";
import { ShoppingCart, RefreshCw, CheckCircle2, ExternalLink } from "lucide-react";
import { CREDIT_PACKS } from "@/lib/economy/pricing";

interface Purchase {
  id:              string;
  userId:          string;
  userEmail:       string;
  userPlan:        string;
  packId:          string;
  packName:        string;
  creditsAdded:    number;
  bonusCredits:    number;
  totalCredits:    number;
  amountPaidBRL:   number;
  stripeSessionId: string;
  createdAt:       string;
}

interface Pagination {
  page: number; perPage: number; total: number; totalPages: number;
}

interface PageData {
  purchases:  Purchase[];
  pagination: Pagination;
}

function fmtBRL(n: number) {
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PackPurchasesPage() {
  const [data,    setData]    = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [page,    setPage]    = useState(1);

  async function load(p = page) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/pack-purchases?page=${p}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(page); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  // Aggregate metrics from current page (for quick KPIs when all records fit in one page)
  const totalRevBRL    = data?.purchases.reduce((s, p) => s + p.amountPaidBRL, 0) ?? 0;
  const totalCredits   = data?.purchases.reduce((s, p) => s + p.totalCredits, 0) ?? 0;
  const packNameMap    = Object.fromEntries(CREDIT_PACKS.map((p) => [p.id, p.name]));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Pack Sales</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Histórico de compras de créditos avulsos · idempotência garantida.
          </p>
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
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Total de Vendas",
            value: loading ? "…" : (data?.pagination.total ?? 0).toString(),
            color: "text-indigo-400",
            sub:   "packs comprados",
          },
          {
            label: "Receita (página atual)",
            value: loading ? "…" : fmtBRL(totalRevBRL),
            color: "text-emerald-400",
            sub:   `${data?.purchases.length ?? 0} registros`,
          },
          {
            label: "Créditos Distribuídos",
            value: loading ? "…" : totalCredits.toLocaleString("pt-BR"),
            color: "text-zinc-300",
            sub:   "nesta página",
          },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-[#0a0a0a] border border-white/5 rounded-xl p-5">
            <div className="text-[10px] uppercase tracking-widest text-zinc-600 font-semibold mb-2">{kpi.label}</div>
            <div className={`text-2xl font-bold font-mono ${loading ? "text-zinc-600 animate-pulse" : kpi.color}`}>
              {kpi.value}
            </div>
            <div className="text-[10px] text-zinc-600 mt-1">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#0a0a0a] border border-white/5 rounded-xl overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-medium text-white">Compras de Packs</h2>
          {data && (
            <span className="ml-auto text-[10px] text-zinc-600 font-mono">
              {data.pagination.total} total · página {data.pagination.page}/{data.pagination.totalPages}
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="border-b border-white/5 text-[10px] uppercase text-zinc-600 font-semibold tracking-wider bg-[#050505]">
              <tr>
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Pack</th>
                <th className="px-4 py-3 text-right">Créditos</th>
                <th className="px-4 py-3 text-right">Bônus</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3 text-right">Data</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 9 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-3 bg-white/5 rounded w-16" /></td>
                    ))}
                  </tr>
                ))
                : !data || data.purchases.length === 0
                ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center">
                      <ShoppingCart className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                      <p className="text-zinc-600 text-sm">Nenhuma compra de pack ainda</p>
                    </td>
                  </tr>
                )
                : data.purchases.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 font-mono text-[10px] text-zinc-300 max-w-[180px] truncate">
                      {p.userEmail}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[9px] bg-zinc-800 text-zinc-400 border border-white/10 px-1.5 py-0.5 rounded uppercase">
                        {p.userPlan.replace("_", "+")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {packNameMap[p.packId] ?? p.packId}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-300">
                      {p.creditsAdded.toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-500">
                      {p.bonusCredits > 0 ? `+${p.bonusCredits.toLocaleString("pt-BR")}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-200 font-semibold">
                      {p.totalCredits.toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-400 font-semibold">
                      {fmtBRL(p.amountPaidBRL)}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-600 font-mono text-[10px]">
                      {new Date(p.createdAt).toLocaleDateString("pt-BR")} {new Date(p.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mx-auto" aria-label="Fulfillment concluído" />
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
            <span className="text-[10px] text-zinc-600 font-mono">
              {data.pagination.total} registros · {data.pagination.perPage}/página
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="px-3 py-1 text-xs rounded-md bg-white/5 border border-white/10 text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
              >
                ← Anterior
              </button>
              <span className="px-3 py-1 text-xs text-zinc-500">
                {page} / {data.pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                disabled={page === data.pagination.totalPages || loading}
                className="px-3 py-1 text-xs rounded-md bg-white/5 border border-white/10 text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
              >
                Próximo →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stripe dashboard link hint */}
      <div className="flex items-center gap-2 text-[11px] text-zinc-600">
        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
        <span>
          Detalhes de pagamento disponíveis no{" "}
          <span className="text-zinc-400">Stripe Dashboard → Payments</span>
          {" "}usando o stripeSessionId de cada registro.
        </span>
      </div>
    </div>
  );
}
