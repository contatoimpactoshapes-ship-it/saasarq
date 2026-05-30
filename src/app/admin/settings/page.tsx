"use client";

import { Settings, Save } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Admin Settings</h1>
        <p className="text-zinc-500 text-sm mt-1">Configurações globais do Command Center e do SaaS.</p>
      </div>

      <div className="bg-[#0a0a0a] border border-white/5 rounded-xl shadow-2xl max-w-3xl">
         <div className="px-6 py-4 border-b border-white/5">
           <h2 className="text-sm font-medium text-white">Global Rate Limits</h2>
         </div>
         <div className="p-6 space-y-6">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Max Requests / Min (Per User)</label>
              <input type="number" defaultValue={60} className="w-full bg-[#050505] border border-white/10 rounded-md py-2 px-3 text-sm text-white outline-none focus:border-indigo-500/50 transition-colors max-w-xs" />
              <p className="text-xs text-zinc-600 mt-1">Limita chamadas à API `generate/` para evitar abuso e spam.</p>
            </div>
            <div className="pt-4 border-t border-white/5">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Maintenance Mode</label>
              <div className="flex items-center gap-3">
                <button className="w-12 h-6 rounded-full bg-white/10 relative transition-colors">
                   <div className="w-4 h-4 bg-zinc-400 rounded-full absolute left-1 top-1"></div>
                </button>
                <span className="text-sm text-zinc-300">Desativar plataforma temporariamente (Retorna 503)</span>
              </div>
            </div>
         </div>
         <div className="px-6 py-4 border-t border-white/5 bg-[#050505] flex justify-end rounded-b-xl">
           <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
             <Save className="w-4 h-4" /> Save Configuration
           </button>
         </div>
      </div>
    </div>
  );
}
