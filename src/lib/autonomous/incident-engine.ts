import { emitAdminEvent }     from "@/lib/realtime/event-bus";
import { INCIDENT_AUTO_RESOLVE } from "./heuristics";
import type { Severity, IncidentStatus } from "@/lib/realtime/typed-events";

export interface Incident {
  id:           string;
  incidentType: string;
  severity:     Severity;
  title:        string;
  detail:       string;
  status:       IncidentStatus;
  openedAt:     number;
  updatedAt:    number;
  resolvedAt?:  number;
}

// Process-scoped incident registry. Resets on restart.
// On multi-instance Vercel, each instance holds its own incidents.
const incidents = new Map<string, Incident>();

// One active incident per type — deduplicates same condition firing repeatedly.
const typeToId  = new Map<string, string>(); // incidentType → incidentId

function emit(incident: Incident, eventType: "incident:opened" | "incident:updated" | "incident:resolved") {
  emitAdminEvent({
    type:         eventType,
    id:           crypto.randomUUID(),
    ts:           Date.now(),
    incidentId:   incident.id,
    incidentType: incident.incidentType,
    severity:     incident.severity,
    title:        incident.title,
    detail:       incident.detail,
    status:       incident.status,
    openedAt:     incident.openedAt,
  });
}

// Open or escalate an incident of the given type.
// Returns the incident id.
export function openIncident(opts: {
  incidentType: string;
  severity:     Severity;
  title:        string;
  detail:       string;
}): string {
  const existingId = typeToId.get(opts.incidentType);
  if (existingId) {
    const existing = incidents.get(existingId)!;
    if (existing.status === "RESOLVED") {
      // Condition re-triggered after resolve — open new incident
      typeToId.delete(opts.incidentType);
    } else {
      // Update severity if escalating
      const escalate = severityRank(opts.severity) > severityRank(existing.severity);
      if (escalate || existing.detail !== opts.detail) {
        existing.severity  = escalate ? opts.severity : existing.severity;
        existing.detail    = opts.detail;
        existing.updatedAt = Date.now();
        emit(existing, "incident:updated");
      }
      return existingId;
    }
  }

  const incident: Incident = {
    id:           crypto.randomUUID(),
    incidentType: opts.incidentType,
    severity:     opts.severity,
    title:        opts.title,
    detail:       opts.detail,
    status:       "OPEN",
    openedAt:     Date.now(),
    updatedAt:    Date.now(),
  };

  incidents.set(incident.id, incident);
  typeToId.set(opts.incidentType, incident.id);
  emit(incident, "incident:opened");
  return incident.id;
}

// Resolve an incident by type. No-op if not found / already resolved.
export function resolveByType(incidentType: string, detail?: string): void {
  const id = typeToId.get(incidentType);
  if (!id) return;
  const incident = incidents.get(id);
  if (!incident || incident.status === "RESOLVED") return;
  incident.status     = "RESOLVED";
  incident.detail     = detail ?? incident.detail;
  incident.resolvedAt = Date.now();
  incident.updatedAt  = Date.now();
  typeToId.delete(incidentType);
  emit(incident, "incident:resolved");
}

// Auto-resolve incidents that have been OPEN for too long (stale detection).
export function pruneStaleIncidents(): void {
  const now = Date.now();
  for (const incident of Array.from(incidents.values())) {
    if (incident.status !== "RESOLVED" && now - incident.openedAt > INCIDENT_AUTO_RESOLVE) {
      incident.status     = "RESOLVED";
      incident.resolvedAt = now;
      incident.updatedAt  = now;
      incident.detail     += " [auto-resolvido: sem atividade por 30min]";
      typeToId.delete(incident.incidentType);
      emit(incident, "incident:resolved");
    }
  }
}

// Return all non-resolved incidents sorted by severity then openedAt.
export function getActiveIncidents(): Incident[] {
  return Array.from(incidents.values())
    .filter((i) => i.status !== "RESOLVED")
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || a.openedAt - b.openedAt);
}

// Return all incidents (for audit history).
export function getAllIncidents(): Incident[] {
  return Array.from(incidents.values()).sort((a, b) => b.openedAt - a.openedAt);
}

function severityRank(s: Severity): number {
  return { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }[s] ?? 0;
}
