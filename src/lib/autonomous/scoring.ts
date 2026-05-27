import type { Severity } from "@/lib/realtime/typed-events";

export type { Severity };

export function toSeverity(score: number): Severity {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}

// Colour/label helpers consumed by UI components
export const SEVERITY_COLORS: Record<Severity, string> = {
  CRITICAL: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  HIGH:     "text-amber-400 bg-amber-500/10 border-amber-500/20",
  MEDIUM:   "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  LOW:      "text-sky-400 bg-sky-500/10 border-sky-500/20",
};

export const SEVERITY_DOT: Record<Severity, string> = {
  CRITICAL: "bg-rose-500",
  HIGH:     "bg-amber-500",
  MEDIUM:   "bg-yellow-500",
  LOW:      "bg-sky-500",
};
