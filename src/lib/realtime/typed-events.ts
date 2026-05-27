// Discriminated union of all admin SSE events.
// Every event carries a stable `id` (UUID) and `ts` (epoch ms).

export type AdminEventType =
  | "generation:started"
  | "generation:completed"
  | "generation:failed"
  | "generation:stuck"
  | "pack:purchased"
  | "webhook:fal:failed"
  | "heartbeat"
  | "connected";

export interface GenerationEvent {
  type:        "generation:started" | "generation:completed" | "generation:failed" | "generation:stuck";
  id:          string;
  ts:          number;
  generationId: string;
  userId:      string;
  tool:        string;
  model?:      string;
  creditsCost?: number;
  error?:      string;
}

export interface PackPurchasedEvent {
  type:         "pack:purchased";
  id:           string;
  ts:           number;
  userId:       string;
  packId:       string;
  totalCredits: number;
}

export interface WebhookFailedEvent {
  type:   "webhook:fal:failed";
  id:     string;
  ts:     number;
  detail: string;
}

export interface HeartbeatStats {
  pendingCount:    number;
  processingCount: number;
  stuckCount:      number;
  connections:     number;
}

export interface HeartbeatEvent {
  type:  "heartbeat";
  id:    string;
  ts:    number;
  stats: HeartbeatStats;
}

export interface ConnectedEvent {
  type: "connected";
  id:   string;
  ts:   number;
}

export type AdminEvent =
  | GenerationEvent
  | PackPurchasedEvent
  | WebhookFailedEvent
  | HeartbeatEvent
  | ConnectedEvent;
