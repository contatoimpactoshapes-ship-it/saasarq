"use client";

import { ServerCrash, Cpu, Database, Network } from "lucide-react";

export default function SystemPage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Saúde do Sistema</h1>
          <p className="text-zinc-400 text-sm mt-1">Logs, Vercel Edge, Prisma e conectividade R2.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          All Systems Operational
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-5 hover:bg-white/[0.02] transition-colors">
          <Cpu className="w-5 h-5 text-indigo-400 mb-4" />
          <div className="text-sm font-medium text-zinc-400">Vercel Edge Functions</div>
          <div className="text-2xl font-bold text-white mt-1">12ms</div>
          <div className="text-xs text-zinc-500 mt-2">Latência Média</div>
        </div>
        <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-5 hover:bg-white/[0.02] transition-colors">
          <Database className="w-5 h-5 text-emerald-400 mb-4" />
          <div className="text-sm font-medium text-zinc-400">Supabase (PostgreSQL)</div>
          <div className="text-2xl font-bold text-white mt-1">45ms</div>
          <div className="text-xs text-zinc-500 mt-2">Query Time P95</div>
        </div>
        <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-5 hover:bg-white/[0.02] transition-colors">
          <Network className="w-5 h-5 text-orange-400 mb-4" />
          <div className="text-sm font-medium text-zinc-400">FAL.ai Webhook Pings</div>
          <div className="text-2xl font-bold text-white mt-1">100%</div>
          <div className="text-xs text-zinc-500 mt-2">Taxa de Sucesso</div>
        </div>
        <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-5 hover:bg-white/[0.02] transition-colors">
          <ServerCrash className="w-5 h-5 text-zinc-400 mb-4" />
          <div className="text-sm font-medium text-zinc-400">Cloudflare R2</div>
          <div className="text-2xl font-bold text-white mt-1">2.4 TB</div>
          <div className="text-xs text-zinc-500 mt-2">Storage Ocupado</div>
        </div>
      </div>

      <div className="bg-[#0a0a0a] border border-white/5 rounded-xl overflow-hidden mt-8">
         <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
           <h2 className="text-sm font-medium text-white">Live Logs (Server Components)</h2>
           <div className="text-xs text-zinc-500 font-mono">Tail -f</div>
         </div>
         <div className="p-6 font-mono text-xs text-zinc-400 space-y-2 h-64 overflow-y-auto custom-scrollbar bg-[#050505] inset-shadow-sm">
           <div className="text-zinc-500">[2026-05-25 03:15:22] <span className="text-emerald-400">INFO</span> POST /api/webhooks/fal 200 OK</div>
           <div className="text-zinc-500">[2026-05-25 03:15:24] <span className="text-emerald-400">INFO</span> Stripe Webhook: customer.subscription.created</div>
           <div className="text-zinc-500">[2026-05-25 03:16:01] <span className="text-indigo-400">DEBUG</span> Generation pi_4L... saved to R2.</div>
           <div className="text-zinc-500">[2026-05-25 03:16:45] <span className="text-rose-400">WARN</span> FAL Webhook signature validation failed for req_9M...</div>
           <div className="text-zinc-500">[2026-05-25 03:17:12] <span className="text-emerald-400">INFO</span> Auto-save Workspace wf_3 completed.</div>
         </div>
      </div>
    </div>
  );
}
