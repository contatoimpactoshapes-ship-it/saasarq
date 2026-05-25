"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface Props {
  cooldownSeconds: number;
  onExpired?:      () => void;
}

export function CooldownBanner({ cooldownSeconds, onExpired }: Props) {
  const [remaining, setRemaining] = useState(cooldownSeconds);

  useEffect(() => {
    setRemaining(cooldownSeconds);
    if (cooldownSeconds <= 0) return;

    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onExpired?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldownSeconds, onExpired]);

  if (remaining <= 0) return null;

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const formatted = mins > 0
    ? `${mins}m ${secs.toString().padStart(2, "0")}s`
    : `${secs}s`;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-500/8 border border-blue-500/20 rounded-lg text-sm">
      <Clock className="w-4 h-4 text-blue-400 shrink-0" />
      <span className="text-blue-200">
        Cooldown de vídeo — próxima geração disponível em{" "}
        <span className="font-mono font-medium text-blue-100">{formatted}</span>
      </span>
    </div>
  );
}
