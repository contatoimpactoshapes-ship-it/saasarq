"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Download, Pencil, Heart, Loader2, AlertCircle, Play, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GenerationItem } from "@/stores/useGenerationStore";

interface MediaCardProps {
  generation: GenerationItem;
  index?: number;
}

type MediaType = "image" | "video" | "audio";

function detectMediaType(tool: string): MediaType {
  if (tool.startsWith("VIDEO_") || tool === "VIDEO_GENERATE") return "video";
  if (tool.startsWith("AUDIO_")) return "audio";
  return "image";
}

export function MediaCard({ generation, index = 0 }: MediaCardProps) {
  const [liked, setLiked] = useState(false);
  const mediaType = detectMediaType(generation.tool);

  if (generation.status === "PENDING" || generation.status === "PROCESSING") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.05 }}
        className="aspect-square rounded-xl shimmer flex flex-col items-center justify-center gap-2 border border-[var(--border-subtle)]"
      >
        <Loader2 className="w-6 h-6 text-[var(--text-muted)] animate-spin" />
        <span className="text-xs text-[var(--text-muted)]">
          {mediaType === "video" ? "Gerando vídeo..." : mediaType === "audio" ? "Gerando áudio..." : "Gerando..."}
        </span>
      </motion.div>
    );
  }

  if (generation.status === "FAILED") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.05 }}
        className="aspect-square rounded-xl bg-[var(--bg-secondary)] flex flex-col items-center justify-center gap-2 border border-[var(--border-default)]"
      >
        <AlertCircle className="w-6 h-6 text-red-400" />
        <span className="text-xs text-[var(--text-muted)] text-center px-3 leading-relaxed">
          {generation.errorMessage ?? "Falha na geração"}
        </span>
      </motion.div>
    );
  }

  if (!generation.outputUrls.length) return null;

  // ── Audio card ──────────────────────────────────────────────────────────
  if (mediaType === "audio") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.05 }}
        className="rounded-xl border border-[var(--border-default)] bg-white p-3 flex flex-col gap-2"
      >
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg brand-gradient flex items-center justify-center shrink-0">
            <Volume2 className="w-4 h-4 text-white" />
          </div>
          <p className="text-xs text-[var(--text-muted)] line-clamp-2 flex-1 leading-relaxed">
            {generation.prompt}
          </p>
        </div>
        <audio
          controls
          src={generation.outputUrls[0]}
          className="w-full h-8"
          style={{ accentColor: "var(--color-brand)" }}
        />
      </motion.div>
    );
  }

  // ── Video card ──────────────────────────────────────────────────────────
  if (mediaType === "video") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.05 }}
        className="relative aspect-video rounded-xl overflow-hidden bg-black group"
      >
        <video
          src={generation.outputUrls[0]}
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
          onMouseEnter={(e) => (e.currentTarget as HTMLVideoElement).play()}
          onMouseLeave={(e) => { (e.currentTarget as HTMLVideoElement).pause(); (e.currentTarget as HTMLVideoElement).currentTime = 0; }}
        />
        {/* Play icon overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-60 group-hover:opacity-0 transition-opacity pointer-events-none">
          <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
            <Play className="w-4 h-4 text-white fill-white ml-0.5" />
          </div>
        </div>
        {/* Actions overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end justify-between p-2 opacity-0 group-hover:opacity-100">
          <ActionBtn onClick={() => window.open(generation.outputUrls[0], "_blank")}>
            <Download className="w-3.5 h-3.5" />
          </ActionBtn>
          <ActionBtn onClick={() => setLiked((v) => !v)}>
            <Heart className={cn("w-3.5 h-3.5", liked && "fill-red-400 text-red-400")} />
          </ActionBtn>
        </div>
      </motion.div>
    );
  }

  // ── Image card ──────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "relative aspect-square rounded-xl overflow-hidden bg-[var(--bg-secondary)] group",
        generation.outputUrls.length > 1 && "col-span-2"
      )}
    >
      {generation.outputUrls.length === 1 ? (
        <Image
          src={generation.outputUrls[0]}
          alt={generation.prompt || "Generated"}
          fill
          className="object-cover"
        />
      ) : (
        <div className="grid grid-cols-2 h-full gap-0.5">
          {generation.outputUrls.map((url, i) => (
            <div key={i} className="relative">
              <Image src={url} alt={`${i + 1}`} fill className="object-cover" />
            </div>
          ))}
        </div>
      )}

      {/* Overlay actions */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-end justify-between p-2 opacity-0 group-hover:opacity-100">
        <div className="flex items-center gap-1">
          <ActionBtn
            onClick={() => {
              const a = document.createElement("a");
              a.href = generation.outputUrls[0];
              a.download = `saasarq-${generation.id}.webp`;
              a.target = "_blank";
              a.click();
            }}
          >
            <Download className="w-3.5 h-3.5" />
          </ActionBtn>
          <ActionBtn onClick={() => {}}>
            <Pencil className="w-3.5 h-3.5" />
          </ActionBtn>
        </div>
        <ActionBtn onClick={() => setLiked((v) => !v)}>
          <Heart className={cn("w-3.5 h-3.5", liked && "fill-red-400 text-red-400")} />
        </ActionBtn>
      </div>
    </motion.div>
  );
}

function ActionBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="w-7 h-7 bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center text-[var(--text-primary)] hover:bg-white transition-colors shadow-sm"
    >
      {children}
    </button>
  );
}
