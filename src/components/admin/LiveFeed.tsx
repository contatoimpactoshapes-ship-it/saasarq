"use client";
import { cn } from "@/lib/utils";
import type { AdminEvent } from "@/lib/realtime/typed-events";

const MAX_ITEMS = 20;

export interface FeedEntry {
  key:   string;  // stable unique id for React list
  type:  AdminEvent["type"];
  label: string;
  sub:   string;
  ts:    number;
}

// Build a FeedEntry from any AdminEvent for display in the feed.
export function toFeedEntry(e: AdminEvent): FeedEntry | null {
  switch (e.type) {
    case "generation:started":
      return { key: e.id, type: e.type, label: "Geração iniciada", sub: `${e.tool} · ${e.model ?? "—"}`, ts: e.ts };
    case "generation:completed":
      return { key: e.id, type: e.type, label: "Geração concluída", sub: `${e.tool} · ${e.model ?? "—"} · ${e.creditsCost ?? 0} cr`, ts: e.ts };
    case "generation:failed":
      return { key: e.id, type: e.type, label: "Geração falhou", sub: e.error ?? e.tool, ts: e.ts };
    case "generation:stuck":
      return { key: e.id, type: e.type, label: "Geração travada", sub: `${e.tool} · ${e.model ?? "—"}`, ts: e.ts };
    case "pack:purchased":
      return { key: e.id, type: e.type, label: "Pack adquirido", sub: `${e.packId} · +${e.totalCredits.toLocaleString("pt-BR")} cr`, ts: e.ts };
    case "webhook:fal:failed":
      return { key: e.id, type: e.type, label: "Webhook FAL falhou", sub: e.detail, ts: e.ts };
    case "anomaly:detected":
      return { key: e.id, type: e.type, label: `Anomalia: ${e.title}`, sub: e.detail, ts: e.ts };
    case "incident:opened":
      return { key: e.id, type: e.type, label: `Incidente aberto: ${e.title}`, sub: e.detail, ts: e.ts };
    case "incident:resolved":
      return { key: e.id, type: e.type, label: `Incidente resolvido: ${e.title}`, sub: e.detail, ts: e.ts };
    default:
      return null;
  }
}

// Prepend a new entry, dedup by key, cap at MAX_ITEMS.
export function prependEntry(entries: FeedEntry[], next: FeedEntry): FeedEntry[] {
  const seen = new Set([next.key, ...entries.map((e) => e.key)]);
  return [next, ...entries.filter((e) => seen.has(e.key) && e.key !== next.key)].slice(0, MAX_ITEMS);
}

// ── Styling helpers ────────────────────────────────────────────────────────────

const DOT: Record<string, string> = {
  "generation:started":   "bg-indigo-500",
  "generation:completed": "bg-emerald-500",
  "generation:failed":    "bg-rose-500",
  "generation:stuck":     "bg-amber-500",
  "pack:purchased":       "bg-violet-500",
  "webhook:fal:failed":   "bg-rose-500",
  "anomaly:detected":     "bg-rose-500",
  "incident:opened":      "bg-rose-600",
  "incident:updated":     "bg-amber-500",
  "incident:resolved":    "bg-emerald-500",
};

const LABEL: Record<string, string> = {
  "generation:started":   "text-indigo-400",
  "generation:completed": "text-emerald-400",
  "generation:failed":    "text-rose-400",
  "generation:stuck":     "text-amber-400",
  "pack:purchased":       "text-violet-400",
  "webhook:fal:failed":   "text-rose-400",
  "anomaly:detected":     "text-rose-400",
  "incident:opened":      "text-rose-400",
  "incident:updated":     "text-amber-400",
  "incident:resolved":    "text-emerald-400",
};

function elapsed(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)  return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  entries:   FeedEntry[];
  live:      boolean;
  className?: string;
}

export function LiveFeed({ entries, live, className }: Props) {
  if (!live && entries.length === 0) return null;

  return (
    <div className={cn("bg-[#060606] border border-white/5 rounded-xl overflow-hidden", className)}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            {live && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
            <span className={cn("relative inline-flex rounded-full h-1.5 w-1.5", live ? "bg-emerald-500" : "bg-zinc-700")} />
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
            Live Feed
          </span>
        </div>
        <span className="text-[10px] text-zinc-600 tabular-nums">{entries.length} evento{entries.length !== 1 ? "s" : ""}</span>
      </div>

      {entries.length === 0 ? (
        <div className="px-4 py-6 text-center text-xs text-zinc-600">
          Aguardando eventos…
        </div>
      ) : (
        <ul className="divide-y divide-white/[0.03] max-h-72 overflow-y-auto custom-scrollbar">
          {entries.map((entry) => (
            <li key={entry.key} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.015] transition-colors animate-in fade-in slide-in-from-top-1 duration-300">
              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", DOT[entry.type] ?? "bg-zinc-600")} />
              <span className={cn("text-xs font-medium shrink-0 w-36", LABEL[entry.type] ?? "text-zinc-400")}>
                {entry.label}
              </span>
              <span className="text-xs text-zinc-500 truncate flex-1">{entry.sub}</span>
              <span className="text-[10px] text-zinc-600 tabular-nums shrink-0">{elapsed(entry.ts)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
