import { emitAdminEvent }           from "@/lib/realtime/event-bus";
import { ALERT_COOLDOWN_MS, CRITICAL_COOLDOWN_MS } from "./heuristics";
import type { Severity }            from "@/lib/realtime/typed-events";

// Per-key cooldown: key → lastFiredAt (epoch ms)
const cooldowns = new Map<string, number>();

export function canFire(key: string, severity: Severity): boolean {
  const cooldown = severity === "CRITICAL" ? CRITICAL_COOLDOWN_MS : ALERT_COOLDOWN_MS;
  const last     = cooldowns.get(key) ?? 0;
  return Date.now() - last > cooldown;
}

export function markFired(key: string): void {
  cooldowns.set(key, Date.now());
}

export function fireAnomaly(opts: {
  key:             string;
  anomalyType:     string;
  severity:        Severity;
  title:           string;
  detail:          string;
  score:           number;
  affectedUserId?: string;
}): boolean {
  if (!canFire(opts.key, opts.severity)) return false;
  markFired(opts.key);
  emitAdminEvent({
    type:          "anomaly:detected",
    id:            crypto.randomUUID(),
    ts:            Date.now(),
    anomalyType:   opts.anomalyType,
    severity:      opts.severity,
    title:         opts.title,
    detail:        opts.detail,
    score:         opts.score,
    affectedUserId: opts.affectedUserId,
  });
  return true;
}

// Reset all cooldowns (useful for tests / manual ops)
export function clearCooldowns(): void {
  cooldowns.clear();
}
