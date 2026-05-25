"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Filter, MoreHorizontal, RefreshCw } from "lucide-react";

interface AdminUser {
  id:               string;
  email:            string;
  name:             string | null;
  plan:             string;
  credits:          number;
  isAdmin:          boolean;
  stripeCustomerId: string | null;
  stripeSubId:      string | null;
  createdAt:        string;
  updatedAt:        string;
  _count:           { generations: number; spaces: number };
}

interface UsersResponse {
  users:  AdminUser[];
  total:  number;
  page:   number;
  limit:  number;
  pages:  number;
}

const PLAN_STYLES: Record<string, string> = {
  PRO:          "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  PREMIUM_PLUS: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  PREMIUM:      "bg-purple-500/10 text-purple-400 border-purple-500/20",
  ESSENTIAL:    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  FREE:         "bg-zinc-800 text-zinc-400 border-white/5",
};

export default function UsersPage() {
  const [data,    setData]    = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [search,  setSearch]  = useState("");
  const [page,    setPage]    = useState(1);
  const [planFilter, setPlanFilter] = useState("");

  const load = useCallback(async (p = page, s = search, plan = planFilter) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "20" });
      if (s)    params.set("search", s);
      if (plan) params.set("plan", plan);
      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, [page, search, planFilter]);

  useEffect(() => { load(); }, [load]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load(1, search, planFilter);
  }

  function handlePlan(plan: string) {
    setPlanFilter(plan);
    setPage(1);
    load(1, search, plan);
  }

  function handlePage(next: number) {
    setPage(next);
    load(next, search, planFilter);
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Gestão de Usuários</h1>
          <p className="text-zinc-400 text-sm mt-1">Gerencie clientes, planos e status da conta.</p>
        </div>
        <div className="flex items-center gap-3">
          <form onSubmit={handleSearch} className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar email ou nome..."
              className="bg-[#0a0a0a] border border-white/10 rounded-md py-1.5 pl-9 pr-4 text-sm text-zinc-200 outline-none focus:border-indigo-500/50 w-56"
            />
          </form>
          <div className="relative group">
            <button className="bg-[#0a0a0a] border border-white/10 rounded-md p-1.5 text-zinc-400 hover:text-white transition-colors">
              <Filter className="w-5 h-5" />
            </button>
            <div className="absolute right-0 top-9 z-10 hidden group-focus-within:flex flex-col bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl overflow-hidden min-w-[140px]">
              {["", "FREE", "ESSENTIAL", "PREMIUM", "PREMIUM_PLUS", "PRO"].map((p) => (
                <button
                  key={p}
                  onClick={() => handlePlan(p)}
                  className={`px-4 py-2 text-sm text-left hover:bg-white/5 transition-colors ${planFilter === p ? "text-indigo-400" : "text-zinc-300"}`}
                >
                  {p || "Todos os planos"}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => load(page, search, planFilter)}
            disabled={loading}
            className="bg-[#0a0a0a] border border-white/10 rounded-md p-1.5 text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-rose-400 text-sm">
          Erro ao carregar: {error}
        </div>
      )}

      <div className="bg-[#0a0a0a] border border-white/5 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#121212] border-b border-white/5 text-xs uppercase text-zinc-500 font-medium">
              <tr>
                <th className="px-6 py-4">Usuário</th>
                <th className="px-6 py-4">Plano</th>
                <th className="px-6 py-4">Créditos</th>
                <th className="px-6 py-4">Gerações</th>
                <th className="px-6 py-4">Membro desde</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-white/5" /><div className="space-y-1"><div className="w-32 h-3 bg-white/5 rounded"/><div className="w-24 h-2 bg-white/5 rounded"/></div></div></td>
                    <td className="px-6 py-4"><div className="w-20 h-5 bg-white/5 rounded"/></td>
                    <td className="px-6 py-4"><div className="w-16 h-3 bg-white/5 rounded"/></td>
                    <td className="px-6 py-4"><div className="w-10 h-3 bg-white/5 rounded"/></td>
                    <td className="px-6 py-4"><div className="w-24 h-3 bg-white/5 rounded"/></td>
                    <td className="px-6 py-4" />
                  </tr>
                ))
                : data?.users.map((user) => (
                  <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-xs font-semibold text-white">
                          {(user.name ?? user.email).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-zinc-200">{user.name ?? "—"}</div>
                          <div className="text-zinc-500 text-xs">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium border ${PLAN_STYLES[user.plan] ?? PLAN_STYLES["FREE"]}`}>
                        {user.plan}
                      </span>
                      {user.isAdmin && <span className="ml-1 text-[10px] text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1 rounded">admin</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-zinc-300">{user.credits.toLocaleString("pt-BR")}</div>
                    </td>
                    <td className="px-6 py-4 text-zinc-400 text-xs font-mono">
                      {user._count.generations}
                    </td>
                    <td className="px-6 py-4 text-zinc-400 text-xs">
                      {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-1 text-zinc-500 hover:text-white transition-colors">
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-white/5 flex items-center justify-between text-sm text-zinc-500">
          <span>
            {data
              ? `Mostrando ${(data.page - 1) * data.limit + 1}–${Math.min(data.page * data.limit, data.total)} de ${data.total.toLocaleString("pt-BR")} usuários`
              : loading ? "Carregando..." : ""
            }
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePage(page - 1)}
              disabled={page <= 1 || loading}
              className="px-3 py-1 rounded border border-white/10 hover:bg-white/5 transition-colors disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="text-xs text-zinc-400 font-mono">{page} / {data?.pages ?? "?"}</span>
            <button
              onClick={() => handlePage(page + 1)}
              disabled={!data || page >= data.pages || loading}
              className="px-3 py-1 rounded border border-white/10 hover:bg-white/5 transition-colors disabled:opacity-40"
            >
              Próximo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
