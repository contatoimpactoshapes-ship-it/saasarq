"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Users,
  Activity,
  Bot,
  Zap,
  DollarSign,
  HeartPulse,
  ShieldAlert,
  TrendingUp,
  ShoppingCart,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { name: "Overview", href: "/admin/overview", icon: BarChart3 },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Generations", href: "/admin/generations", icon: Zap },
  { name: "Revenue", href: "/admin/revenue", icon: DollarSign },
  { name: "AI Costs", href: "/admin/ai-costs", icon: Activity },
  { name: "Economy Engine", href: "/admin/economy", icon: TrendingUp },
  { name: "Pack Sales",     href: "/admin/pack-purchases", icon: ShoppingCart },
  { name: "System Health", href: "/admin/health", icon: HeartPulse },
  { name: "Agents", href: "/admin/agents", icon: Bot },
  { name: "Audit Log", href: "/admin/audit", icon: ShieldAlert },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <div className="h-full flex flex-col py-6 px-4 bg-[#050505] border-r border-white/5">
      <div className="mb-8 px-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-gradient-to-br from-zinc-800 to-zinc-950 border border-white/10 flex items-center justify-center shadow-lg">
          <span className="text-white font-bold text-xs tracking-tighter">CMD</span>
        </div>
        <span className="font-medium text-white tracking-wide text-sm">SaaS Command</span>
      </div>

      <div className="space-y-1 flex-1">
        <div className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-4 px-3">
          Operacional
        </div>
        
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group",
                isActive 
                  ? "bg-white/[0.04] text-white border border-white/[0.05] shadow-sm" 
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.02] border border-transparent"
              )}
            >
              <item.icon className={cn("w-4 h-4 transition-colors", isActive ? "text-indigo-400" : "text-zinc-600 group-hover:text-zinc-400")} />
              {item.name}
            </Link>
          );
        })}
      </div>

      <div className="mt-auto pt-6 border-t border-white/5">
        <div className="px-3 py-2 text-[10px] text-zinc-500 flex items-center justify-between font-mono">
          <span>OP_CENTER_v3.0</span>
          <span className="flex items-center gap-1.5">
             <span className="relative flex h-2 w-2">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
             </span>
             ONLINE
          </span>
        </div>
      </div>
    </div>
  );
}
