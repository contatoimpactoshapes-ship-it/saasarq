import { onAdminEvent }   from "@/lib/realtime/event-bus";
import { fireAnomaly }    from "./alert-engine";
import { openIncident, resolveByType, pruneStaleIncidents } from "./incident-engine";
import { toSeverity }     from "./scoring";
import {
  WINDOW_MS, WINDOW_LONG_MS, MAX_WINDOW_EVENTS,
  FAILURE_RATE_WARNING, FAILURE_RATE_CRITICAL, FAILURE_RATE_MIN_SAMPLES,
  STUCK_WARNING, STUCK_CRITICAL,
  PENDING_WARNING, PENDING_CRITICAL,
  USER_BURST_WARNING, USER_BURST_CRITICAL,
  USER_COST_CRITICAL,
  WEBHOOK_FAIL_THRESHOLD,
  failureRateScore, stuckScore, burstScore, pendingScore,
} from "./heuristics";
import type { GenerationEvent, HeartbeatStats } from "@/lib/realtime/typed-events";

// ── Rolling event store ────────────────────────────────────────────────────────

interface GenRecord {
  ts:          number;
  userId:      string;
  tool:        string;
  creditsCost: number;
  outcome:     "started" | "completed" | "failed";
}

const genWindow:      GenRecord[]              = [];
const webhookFails:   number[]                 = []; // timestamps of FAL webhook failures
const userBurstMap    = new Map<string, { count: number; creditsCost: number; firstTs: number }>();

// ── Lifecycle ─────────────────────────────────────────────────────────────────

let started = false;

export function startAnomalyEngine(): void {
  if (started) return;
  started = true;

  onAdminEvent((event) => {
    switch (event.type) {
      case "generation:started":
        recordGen(event, "started");
        checkUserBurst(event);
        break;

      case "generation:completed":
        recordGen(event, "completed");
        checkFailureRate();
        break;

      case "generation:failed":
        recordGen(event, "failed");
        checkFailureRate();
        break;

      case "webhook:fal:failed":
        webhookFails.push(Date.now());
        checkWebhookReliability();
        break;

      case "heartbeat":
        checkHeartbeatStats(event.stats);
        pruneWindows();
        pruneStaleIncidents();
        break;
    }
  });
}

// ── Detection functions ────────────────────────────────────────────────────────

function checkFailureRate(): void {
  const cutoff   = Date.now() - WINDOW_MS;
  const terminal = genWindow.filter((e) => e.ts > cutoff && (e.outcome === "completed" || e.outcome === "failed"));
  if (terminal.length < FAILURE_RATE_MIN_SAMPLES) return;

  const failCount = terminal.filter((e) => e.outcome === "failed").length;
  const rate      = failCount / terminal.length;

  if (rate >= FAILURE_RATE_WARNING) {
    const score    = failureRateScore(rate);
    const severity = toSeverity(score);
    const pct      = Math.round(rate * 100);
    openIncident({
      incidentType: "failure-rate",
      severity,
      title:        "Taxa de falha elevada",
      detail:       `${pct}% das gerações falharam nos últimos 5 min (${failCount}/${terminal.length})`,
    });
    fireAnomaly({
      key:         "failure-rate",
      anomalyType: "failure-rate",
      severity,
      title:       "Taxa de falha elevada",
      detail:      `${pct}% — ${failCount} falhas em ${terminal.length} gerações`,
      score,
    });
  } else {
    resolveByType("failure-rate", "Taxa de falha voltou ao normal");
  }
}

function checkUserBurst(event: GenerationEvent): void {
  const now = Date.now();
  const uid = event.userId;
  let entry = userBurstMap.get(uid);

  if (!entry || now - entry.firstTs > WINDOW_MS) {
    entry = { count: 0, creditsCost: 0, firstTs: now };
  }
  entry.count++;
  entry.creditsCost += event.creditsCost ?? 0;
  userBurstMap.set(uid, entry);

  if (entry.count >= USER_BURST_WARNING) {
    const score    = burstScore(entry.count);
    const severity = toSeverity(score);
    openIncident({
      incidentType: `user-burst:${uid}`,
      severity,
      title:        "Burst de gerações por usuário",
      detail:       `Usuário ${uid.slice(0, 8)}… iniciou ${entry.count} gerações em <5min`,
    });
    fireAnomaly({
      key:            `user-burst:${uid}`,
      anomalyType:    "user-burst",
      severity,
      title:          "Burst de gerações detectado",
      detail:         `${entry.count} gerações em <5 min — userId: ${uid.slice(0, 12)}…`,
      score,
      affectedUserId: uid,
    });
  }

  if (entry.creditsCost >= USER_COST_CRITICAL) {
    openIncident({
      incidentType: `cost-explosion:${uid}`,
      severity:     "CRITICAL",
      title:        "Explosão de custo por usuário",
      detail:       `Usuário ${uid.slice(0, 8)}… consumiu ${entry.creditsCost.toLocaleString("pt-BR")} cr em <5min`,
    });
    fireAnomaly({
      key:            `cost-explosion:${uid}`,
      anomalyType:    "cost-explosion",
      severity:       "CRITICAL",
      title:          "Explosão de consumo de créditos",
      detail:         `${entry.creditsCost.toLocaleString("pt-BR")} cr em <5min — userId: ${uid.slice(0, 12)}…`,
      score:          92,
      affectedUserId: uid,
    });
  }
}

function checkHeartbeatStats(stats: HeartbeatStats): void {
  // ── Stuck jobs ────────────────────────────────────────────────────────────
  if (stats.stuckCount >= STUCK_WARNING) {
    const score    = stuckScore(stats.stuckCount);
    const severity = toSeverity(score);
    openIncident({
      incidentType: "stuck-jobs",
      severity,
      title:        "Gerações travadas detectadas",
      detail:       `${stats.stuckCount} gerações em PROCESSING há >30min`,
    });
    fireAnomaly({
      key:         "stuck-jobs",
      anomalyType: "stuck-jobs",
      severity,
      title:       "Gerações travadas",
      detail:      `${stats.stuckCount} jobs travados`,
      score,
    });
  } else if (stats.stuckCount === 0) {
    resolveByType("stuck-jobs", "Nenhuma geração travada detectada");
  }

  // ── Queue congestion ──────────────────────────────────────────────────────
  if (stats.pendingCount >= PENDING_WARNING) {
    const score    = pendingScore(stats.pendingCount);
    const severity = toSeverity(score);
    openIncident({
      incidentType: "queue-congestion",
      severity,
      title:        "Congestionamento de fila",
      detail:       `${stats.pendingCount} gerações aguardando (PENDING)`,
    });
    fireAnomaly({
      key:         "queue-congestion",
      anomalyType: "queue-congestion",
      severity,
      title:       "Fila congestionada",
      detail:      `${stats.pendingCount} jobs em PENDING`,
      score,
    });
  } else if (stats.pendingCount < PENDING_WARNING * 0.6) {
    resolveByType("queue-congestion", "Fila normalizada");
  }
}

function checkWebhookReliability(): void {
  const cutoff  = Date.now() - WINDOW_MS;
  const recent  = webhookFails.filter((t) => t > cutoff);
  if (recent.length >= WEBHOOK_FAIL_THRESHOLD) {
    openIncident({
      incidentType: "webhook-reliability",
      severity:     "HIGH",
      title:        "Falhas repetidas no webhook FAL",
      detail:       `${recent.length} falhas de webhook FAL nos últimos 5 min — possível degradação do provider`,
    });
    fireAnomaly({
      key:         "webhook-reliability",
      anomalyType: "webhook-reliability",
      severity:    "HIGH",
      title:       "Webhook FAL instável",
      detail:      `${recent.length} falhas em <5min`,
      score:       70,
    });
  }
}

// ── Window maintenance ────────────────────────────────────────────────────────

function recordGen(event: GenerationEvent, outcome: GenRecord["outcome"]): void {
  genWindow.push({
    ts:          Date.now(),
    userId:      event.userId,
    tool:        event.tool,
    creditsCost: event.creditsCost ?? 0,
    outcome,
  });
  // Hard cap — evict oldest entries first
  if (genWindow.length > MAX_WINDOW_EVENTS) {
    genWindow.splice(0, genWindow.length - MAX_WINDOW_EVENTS);
  }
}

function pruneWindows(): void {
  const cutoff = Date.now() - WINDOW_LONG_MS;
  // Prune gen window
  let i = 0;
  while (i < genWindow.length && genWindow[i].ts < cutoff) i++;
  if (i > 0) genWindow.splice(0, i);
  // Prune webhook fails
  let j = 0;
  while (j < webhookFails.length && webhookFails[j] < cutoff) j++;
  if (j > 0) webhookFails.splice(0, j);
  // Prune stale user burst entries
  const burstCutoff = Date.now() - WINDOW_MS;
  for (const [uid, entry] of Array.from(userBurstMap)) {
    if (entry.firstTs < burstCutoff) userBurstMap.delete(uid);
  }
}
