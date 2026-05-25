"use client";

import { HeartPulse, CheckCircle2, AlertTriangle, ShieldAlert, Clock, Database, Cloud } from "lucide-react";

export default function HealthPage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">System Health & Ops</h1>
        <p className="text-zinc-500 text-sm mt-1">Live status, queuing and provider reliability metrics.</p>
      </div>

      {/* Global Status Banner */}
      <div className="w-full border border-emerald-500/20 bg-emerald-500/5 rounded-xl p-4 flex items-center justify-between">
         <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
             <HeartPulse className="w-5 h-5 text-emerald-400" />
           </div>
           <div>
             <div className="text-emerald-400 font-bold tracking-wide">All Systems Operational</div>
             <div className="text-xs text-emerald-500/70">Uptime 99.98% in the last 30 days</div>
           </div>
         </div>
         <div className="hidden sm:block text-right">
           <div className="text-xs font-mono text-zinc-500">Last checked: Just now</div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Services */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest px-1">Core Services</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2"><Database className="w-4 h-4 text-zinc-400"/> <span className="text-white font-medium">Supabase Database</span></div>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl font-mono text-white">45ms</div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Avg Query Time</div>
                </div>
                <div className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded font-mono">Normal</div>
              </div>
            </div>

            <div className="bg-[#0a0a0a] border border-amber-500/20 rounded-xl p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl"></div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2"><Cloud className="w-4 h-4 text-amber-400"/> <span className="text-white font-medium">FAL.ai Provider</span></div>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl font-mono text-white">412ms</div>
                  <div className="text-[10px] text-amber-500/70 uppercase tracking-wider mt-1">Webhook Latency (Degraded)</div>
                </div>
                <div className="text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded font-mono">Slow</div>
              </div>
            </div>
            
            <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-zinc-400"/> <span className="text-white font-medium">Vercel Edge Functions</span></div>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl font-mono text-white">12ms</div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Execution Time</div>
                </div>
              </div>
            </div>
          </div>

          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest px-1 mt-8">Queue & Anomalies</h2>
          <div className="bg-[#0a0a0a] border border-white/5 rounded-xl divide-y divide-white/5">
             <div className="p-4 flex items-center justify-between hover:bg-white/[0.02]">
               <div>
                 <div className="text-white font-medium text-sm">Stuck Jobs (FAL.ai)</div>
                 <div className="text-xs text-zinc-500 mt-1">Gerações paradas em Processing &gt; 5 min</div>
               </div>
               <div className="text-rose-400 font-mono font-medium bg-rose-400/10 px-3 py-1 rounded-md">2 alerts</div>
             </div>
             <div className="p-4 flex items-center justify-between hover:bg-white/[0.02]">
               <div>
                 <div className="text-white font-medium text-sm">Failed Webhooks</div>
                 <div className="text-xs text-zinc-500 mt-1">Webhooks recebidos com assinatura inválida (Hacking attempt?)</div>
               </div>
               <div className="text-amber-400 font-mono font-medium bg-amber-400/10 px-3 py-1 rounded-md">1 blocked</div>
             </div>
          </div>
        </div>

        {/* Realtime Incident Feed */}
        <div className="bg-[#0a0a0a] border border-white/5 rounded-xl overflow-hidden h-full flex flex-col shadow-2xl">
          <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-medium text-white">Incident Feed</h2>
          </div>
          <div className="flex-1 p-5 space-y-6 overflow-y-auto">
             <div className="relative pl-4 border-l border-amber-500/30">
               <div className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500"></div>
               <div className="text-xs text-zinc-500 font-mono mb-1">Hoje, 03:15 PM</div>
               <div className="text-sm text-zinc-200">FAL.ai reportou latência alta para modelos SDXL.</div>
             </div>
             <div className="relative pl-4 border-l border-emerald-500/30">
               <div className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500"></div>
               <div className="text-xs text-zinc-500 font-mono mb-1">Hoje, 01:00 PM</div>
               <div className="text-sm text-zinc-200">Migração do banco de dados concluída sem downtime.</div>
             </div>
             <div className="relative pl-4 border-l border-rose-500/30">
               <div className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-rose-500/20 border border-rose-500"></div>
               <div className="text-xs text-zinc-500 font-mono mb-1">Ontem, 22:45 PM</div>
               <div className="text-sm text-zinc-200">Tentativa de spoofing no webhook FAL. Assinatura HMAC inválida. Ação bloqueada pelo Edge.</div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
