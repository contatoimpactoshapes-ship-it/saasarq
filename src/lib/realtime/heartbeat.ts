import { prisma }         from "@/lib/prisma";
import { emitAdminEvent } from "./event-bus";
import { connectionCount } from "./broadcaster";

const INTERVAL_MS  = 30_000; // 30 s — DB overhead is 3 lightweight counts
const STUCK_WINDOW = 30 * 60 * 1000; // 30 min

let timer: NodeJS.Timeout | null = null;

async function tick() {
  const staleTs = new Date(Date.now() - STUCK_WINDOW);

  const [pendingCount, processingCount, stuckCount] = await Promise.all([
    prisma.generation.count({ where: { status: "PENDING" } }),
    prisma.generation.count({ where: { status: "PROCESSING" } }),
    prisma.generation.count({ where: { status: "PROCESSING", updatedAt: { lte: staleTs } } }),
  ]).catch(() => [0, 0, 0] as const);

  emitAdminEvent({
    type:  "heartbeat",
    id:    crypto.randomUUID(),
    ts:    Date.now(),
    stats: { pendingCount, processingCount, stuckCount, connections: connectionCount() },
  });
}

// Called by the SSE route on first connection. Idempotent.
export function startHeartbeat(): void {
  if (timer) return;
  timer = setInterval(tick, INTERVAL_MS);
  // Unref so the timer doesn't prevent the process from exiting cleanly.
  timer.unref?.();
}
