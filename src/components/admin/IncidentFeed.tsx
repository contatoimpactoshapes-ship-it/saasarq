"use client";
import { cn }                from "@/lib/utils";
import { SEVERITY_COLORS, SEVERITY_DOT } from "@/lib/autonomous/scoring";
import type { Severity, IncidentStatus } from "@/lib/realtime/typed-events";

export interface IncidentCard {
  id:           string;
  incidentType: string;
  severity:     Severity;
  title:        string;
  detail:       string;
  status:       IncidentStatus;
  openedAt:     number;
  resolvedAt?:  number;
}

const STATUS_LABEL: Record<IncidentStatus, string> = {
  OPEN:          "Aberto",
  INVESTIGATING: "Investigando",
  RESOLVED:      "Resolvido",
};

const STATUS_STYLE: Record<IncidentStatus, string> = {
  OPEN:          "text-rose-400 bg-rose-500/10 border-rose-500/20",
  INVESTIGATING: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  RESOLVED:      "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
};

function elapsed(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)   return `${s}s atrás`;
  if (s < 3600) return `${Math.floor(s / 60)}min atrás`;
  return `${Math.floor(s / 3600)}h atrás`;
}

interface Props {
  incidents:  IncidentCard[];
  live:       boolean;
  className?: string;
}

export function IncidentFeed({ incidents, live, className }: Props) {
  const active   = incidents.filter((i) => i.status !== "RESOLVED");
  const resolved = incidents.filter((i) => i.status === "RESOLVED");

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            {live && active.length > 0 && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            )}
            <span className={cn(
              "relative inline-flex rounded-full h-1.5 w-1.5",
              active.length > 0 ? "bg-rose-500" : live ? "bg-emerald-500" : "bg-zinc-700",
            )} />
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
            Incidents
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-zinc-600">
          {active.length > 0 && (
            <span className="text-rose-400 font-semibold">{active.length} ativo{active.length !== 1 ? "s" : ""}</span>
          )}
          {resolved.length > 0 && (
            <span>{resolved.length} resolvido{resolved.length !== 1 ? "s" : ""}</span>
          )}
        </div>
      </div>

      {/* Empty state */}
      {incidents.length === 0 && (
        <div className="bg-[#060606] border border-white/5 rounded-xl px-4 py-6 text-center">
          <div className="text-xs text-emerald-400 font-medium">
            {live ? "Nenhum incidente ativo — sistema saudável" : "Aguardando conexão…"}
          </div>
        </div>
      )}

      {/* Active incidents */}
      {active.map((inc) => (
        <div
          key={inc.id}
          className="bg-[#060606] border border-white/[0.06] rounded-xl p-4 animate-in fade-in slide-in-from-top-2 duration-300 hover:border-white/10 transition-colors"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className={cn("w-2 h-2 rounded-full shrink-0 mt-0.5", SEVERITY_DOT[inc.severity])} />
              <span className="text-sm font-semibold text-white truncate">{inc.title}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={cn("text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border", SEVERITY_COLORS[inc.severity])}>
                {inc.severity}
              </span>
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded border", STATUS_STYLE[inc.status])}>
                {STATUS_LABEL[inc.status]}
              </span>
            </div>
          </div>
          <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{inc.detail}</p>
          <div className="flex items-center justify-between mt-3">
            <span className="text-[10px] font-mono text-zinc-600">{inc.incidentType}</span>
            <span className="text-[10px] text-zinc-600">{elapsed(inc.openedAt)}</span>
          </div>
        </div>
      ))}

      {/* Resolved (collapsed, muted) */}
      {resolved.length > 0 && (
        <div className="space-y-1">
          {resolved.map((inc) => (
            <div key={inc.id} className="flex items-center gap-3 px-4 py-2 bg-[#060606] border border-white/[0.03] rounded-lg opacity-50 hover:opacity-70 transition-opacity">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
              <span className="text-xs text-zinc-500 truncate flex-1">{inc.title}</span>
              <span className="text-[10px] text-zinc-600 shrink-0">{elapsed(inc.openedAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
