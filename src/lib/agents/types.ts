export type AlertSeverity = "critical" | "warning" | "info";

export interface Alert {
  id:       string;
  severity: AlertSeverity;
  title:    string;
  detail:   string;
  metric?:  string | number;
}

export interface Recommendation {
  id:     string;
  title:  string;
  detail: string;
  impact: "high" | "medium" | "low";
}

export interface AgentResult {
  agentId:         string;
  status:          "ok" | "warning" | "critical" | "error";
  alerts:          Alert[];
  recommendations: Recommendation[];
  metrics:         Record<string, number | string | boolean>;
  runAt:           string; // ISO timestamp
  durationMs:      number;
}
