import { requireAdmin }   from "@/lib/admin";
import { subscribe }      from "@/lib/realtime/broadcaster";
import { startHeartbeat } from "@/lib/realtime/heartbeat";

export const runtime = "nodejs";       // Required: EventEmitter + ReadableStream
export const dynamic = "force-dynamic"; // Never cache SSE responses

const enc = new TextEncoder();

export async function GET() {
  // Auth guard — 401/403 before opening the stream.
  try {
    await requireAdmin();
  } catch {
    return new Response("Forbidden", { status: 403 });
  }

  startHeartbeat(); // idempotent — starts exactly once per process

  const id = crypto.randomUUID();
  let cleanup: (() => void) | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Confirmation ping so the client knows it's live.
      controller.enqueue(
        enc.encode(
          `data: ${JSON.stringify({ type: "connected", id, ts: Date.now() })}\n\n`,
        ),
      );
      cleanup = subscribe(id, controller);
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":      "text/event-stream",
      "Cache-Control":     "no-cache, no-transform",
      "Connection":        "keep-alive",
      "X-Accel-Buffering": "no", // disable Nginx / Vercel proxy buffering
    },
  });
}
