"use client";
import { cn } from "@/lib/utils";

interface Props {
  live:       boolean;
  eventCount?: number;
  className?: string;
}

// Pulse indicator shown next to page titles when the SSE stream is active.
export function LiveBadge({ live, eventCount, className }: Props) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        className={cn(
          "flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded border transition-colors",
          live
            ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
            : "text-zinc-600 bg-white/[0.02] border-white/5",
        )}
      >
        <span className="relative flex h-1.5 w-1.5">
          {live && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          )}
          <span
            className={cn(
              "relative inline-flex rounded-full h-1.5 w-1.5",
              live ? "bg-emerald-500" : "bg-zinc-600",
            )}
          />
        </span>
        {live ? "live" : "offline"}
      </span>

      {live && eventCount !== undefined && eventCount > 0 && (
        <span className="text-[10px] text-zinc-500 tabular-nums">
          {eventCount} evento{eventCount !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}
