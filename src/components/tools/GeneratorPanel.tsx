"use client";

import { cn } from "@/lib/utils";

interface GeneratorPanelProps {
  children: React.ReactNode;
  className?: string;
}

export function GeneratorPanel({ children, className }: GeneratorPanelProps) {
  return (
    <aside
      className={cn(
        "w-[280px] shrink-0 flex flex-col bg-white border-r border-[var(--border-subtle)] overflow-y-auto scrollbar-thin",
        className
      )}
    >
      {children}
    </aside>
  );
}
