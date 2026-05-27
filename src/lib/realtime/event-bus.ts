import { EventEmitter } from "events";
import type { AdminEvent } from "./typed-events";

// Singleton EventEmitter for the process lifetime.
// Works perfectly in single-process deployments (local dev, Railway, Render).
// On Vercel multi-instance: events only reach SSE connections in the SAME
// function instance. The 30-second heartbeat compensates with DB-queried
// stats and drives periodic refresh for cross-instance consistency.
const bus = new EventEmitter();
bus.setMaxListeners(500); // headroom for many concurrent admin connections

const CHANNEL = "admin:event";

export function emitAdminEvent(event: AdminEvent): void {
  bus.emit(CHANNEL, event);
}

export function onAdminEvent(handler: (event: AdminEvent) => void): () => void {
  bus.on(CHANNEL, handler);
  return () => bus.off(CHANNEL, handler);
}
