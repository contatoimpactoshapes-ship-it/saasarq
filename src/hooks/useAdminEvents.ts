"use client";
import { useEffect, useRef } from "react";
import type { AdminEvent, HeartbeatStats } from "@/lib/realtime/typed-events";

interface Options {
  onEvent?:      (event: AdminEvent) => void;
  onHeartbeat?:  (stats: HeartbeatStats) => void;
  onConnect?:    () => void;
  onDisconnect?: () => void;
  enabled?:      boolean;
}

// useAdminEvents — subscribe to the /api/admin/events SSE stream.
//
// Callbacks are stored in a ref so callers don't need to memoize them.
// Auto-reconnects with exponential backoff (1s → 30s cap).
export function useAdminEvents({
  onEvent,
  onHeartbeat,
  onConnect,
  onDisconnect,
  enabled = true,
}: Options = {}) {
  const esRef    = useRef<EventSource | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const delayRef = useRef(1_000);
  const cbRef    = useRef({ onEvent, onHeartbeat, onConnect, onDisconnect });
  cbRef.current  = { onEvent, onHeartbeat, onConnect, onDisconnect };

  useEffect(() => {
    if (!enabled) return;

    function connect() {
      esRef.current?.close();
      const es = new EventSource("/api/admin/events");
      esRef.current = es;

      es.onmessage = (e: MessageEvent<string>) => {
        try {
          const data = JSON.parse(e.data) as AdminEvent;

          if (data.type === "connected") {
            delayRef.current = 1_000; // reset backoff on successful connect
            cbRef.current.onConnect?.();
            return;
          }

          if (data.type === "heartbeat") {
            cbRef.current.onHeartbeat?.(data.stats);
            return;
          }

          cbRef.current.onEvent?.(data);
        } catch { /* ignore malformed frames */ }
      };

      es.onerror = () => {
        es.close();
        esRef.current = null;
        cbRef.current.onDisconnect?.();
        timerRef.current = setTimeout(() => {
          delayRef.current = Math.min(delayRef.current * 2, 30_000);
          connect();
        }, delayRef.current);
      };
    }

    connect();

    return () => {
      timerRef.current && clearTimeout(timerRef.current);
      esRef.current?.close();
      esRef.current = null;
    };
  }, [enabled]);
}
