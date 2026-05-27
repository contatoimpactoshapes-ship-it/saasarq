"use client";

import { Search, Bell, Settings } from "lucide-react";

export function AdminHeader() {
  return (
    <header className="h-16 flex-shrink-0 border-b border-white/5 bg-[#0a0a0a] flex items-center justify-between px-8">
      <div className="flex items-center w-96 relative">
        <Search className="w-4 h-4 text-zinc-500 absolute left-3" />
        <input 
          type="text" 
          placeholder="Buscar usuários, transações, spaces..." 
          className="w-full bg-[#121212] border border-white/10 rounded-md py-1.5 pl-9 pr-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
        />
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 text-zinc-400 hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-[#0a0a0a]"></span>
        </button>
        <button className="p-2 text-zinc-400 hover:text-white transition-colors">
          <Settings className="w-5 h-5" />
        </button>
        <div className="w-px h-6 bg-white/10 mx-2"></div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <div className="text-sm font-medium text-white">System Admin</div>
            <div className="text-xs text-zinc-500">Root Access</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center">
            <span className="text-xs font-semibold text-zinc-400">SA</span>
          </div>
        </div>
      </div>
    </header>
  );
}
