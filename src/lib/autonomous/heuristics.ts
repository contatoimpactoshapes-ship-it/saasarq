// ── Rolling windows ────────────────────────────────────────────────────────────
export const WINDOW_MS      = 5  * 60 * 1000; // 5 min  — burst / failure rate
export const WINDOW_LONG_MS = 30 * 60 * 1000; // 30 min — stuck jobs
export const MAX_WINDOW_EVENTS = 500;          // cap stored events to bound memory

// ── Failure rate (fraction of completed+failed in window) ──────────────────────
export const FAILURE_RATE_WARNING  = 0.25; // 25% → HIGH
export const FAILURE_RATE_CRITICAL = 0.45; // 45% → CRITICAL
export const FAILURE_RATE_MIN_SAMPLES = 5; // need ≥ 5 terminal events to fire

// ── Stuck jobs (from heartbeat stats) ─────────────────────────────────────────
export const STUCK_WARNING  = 3;
export const STUCK_CRITICAL = 10;

// ── Queue congestion (pending from heartbeat) ──────────────────────────────────
export const PENDING_WARNING  = 50;
export const PENDING_CRITICAL = 100;

// ── Per-user burst (in WINDOW_MS) ─────────────────────────────────────────────
export const USER_BURST_WARNING  = 15; // 15 generations/5 min → HIGH
export const USER_BURST_CRITICAL = 30; // 30 generations/5 min → CRITICAL

// ── Per-user cost explosion (creditsCost in WINDOW_MS) ────────────────────────
export const USER_COST_CRITICAL = 50_000; // 50k cr in 5 min → CRITICAL

// ── Webhook failures (in WINDOW_MS) ───────────────────────────────────────────
export const WEBHOOK_FAIL_THRESHOLD = 3; // 3 FAL webhook failures in window → HIGH

// ── Alert cooldown ─────────────────────────────────────────────────────────────
export const ALERT_COOLDOWN_MS      = 5  * 60 * 1000; // 5 min between same alert
export const CRITICAL_COOLDOWN_MS   = 2  * 60 * 1000; // 2 min for critical
export const INCIDENT_AUTO_RESOLVE  = 30 * 60 * 1000; // auto-resolve OPEN incidents after 30 min

// ── Scoring helpers ────────────────────────────────────────────────────────────

export function failureRateScore(rate: number): number {
  if (rate >= FAILURE_RATE_CRITICAL) return 90;
  if (rate >= FAILURE_RATE_WARNING)  return 65;
  return 30;
}

export function stuckScore(count: number): number {
  if (count >= STUCK_CRITICAL) return 85;
  if (count >= STUCK_WARNING)  return 60;
  return 20;
}

export function burstScore(count: number): number {
  if (count >= USER_BURST_CRITICAL) return 88;
  if (count >= USER_BURST_WARNING)  return 65;
  return 25;
}

export function pendingScore(count: number): number {
  if (count >= PENDING_CRITICAL) return 72;
  if (count >= PENDING_WARNING)  return 52;
  return 15;
}
