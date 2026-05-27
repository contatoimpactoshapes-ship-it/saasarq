import { onAdminEvent } from "./event-bus";
import type { AdminEvent } from "./typed-events";

interface Subscriber {
  controller: ReadableStreamDefaultController<Uint8Array>;
  lastSeen:   number;
}

// Registry of active SSE connections (process-scoped).
const subscribers = new Map<string, Subscriber>();
const enc = new TextEncoder();

function sse(event: AdminEvent): Uint8Array {
  return enc.encode(`data: ${JSON.stringify(event)}\n\n`);
}

// Register a new SSE client. Returns an unsubscribe function that MUST
// be called from the ReadableStream cancel() callback to prevent leaks.
export function subscribe(
  id: string,
  controller: ReadableStreamDefaultController<Uint8Array>,
): () => void {
  subscribers.set(id, { controller, lastSeen: Date.now() });

  const off = onAdminEvent((event) => {
    const sub = subscribers.get(id);
    if (!sub) return;
    try {
      sub.lastSeen = Date.now();
      controller.enqueue(sse(event));
    } catch {
      // Client disconnected without clean cancel — evict silently.
      subscribers.delete(id);
    }
  });

  return () => {
    off();
    subscribers.delete(id);
  };
}

export function connectionCount(): number {
  return subscribers.size;
}
