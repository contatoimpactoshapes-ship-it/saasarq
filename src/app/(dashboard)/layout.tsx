"use client";

import { useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useSidebarStore } from "@/stores/useSidebarStore";
import { useCreditsStore } from "@/stores/useCreditsStore";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebarStore();
  const { refreshCredits } = useCreditsStore();

  useEffect(() => {
    refreshCredits();
  }, [refreshCredits]);

  const ml = collapsed ? "56px" : "220px";

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <Sidebar />
      <main
        className="transition-[margin-left] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ marginLeft: ml }}
      >
        {children}
      </main>
    </div>
  );
}
