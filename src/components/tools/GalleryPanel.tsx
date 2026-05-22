"use client";

import { motion } from "framer-motion";
import { Sparkles, Video, Mic } from "lucide-react";
import { MediaCard } from "@/components/shared/MediaCard";
import type { GenerationItem } from "@/stores/useGenerationStore";

interface GalleryPanelProps {
  generations: GenerationItem[];
  isGenerating: boolean;
  tabs?: string[];
  tool?: "image" | "video" | "audio";
}

const EMPTY_STATES = {
  image: {
    icon: Sparkles,
    title: "Pronto para criar",
    desc: "Gere imagens por texto ou transforme seu modelo 3D em renderização fotorrealista.",
    placeholders: [
      "Modern living room, floor-to-ceiling windows",
      "Luxury kitchen island, pendant lights",
      "Minimalist bedroom, natural materials",
      "Open office, exposed concrete",
    ],
  },
  video: {
    icon: Video,
    title: "Pronto para criar",
    desc: "Descreva a cena e o movimento — a IA vai gerar um vídeo completo.",
    placeholders: [
      "Camera slowly approaches modern lobby",
      "Aerial flythrough of villa at sunset",
      "Office interior, smooth dolly shot",
      "Luxury bedroom, gentle camera pan",
    ],
  },
  audio: {
    icon: Mic,
    title: "Pronto para narrar",
    desc: "Digite o texto e escolha uma voz — a IA gera a narração na hora.",
    placeholders: [],
  },
};

export function GalleryPanel({
  generations,
  isGenerating,
  tabs = ["Criações", "Favoritas"],
  tool = "image",
}: GalleryPanelProps) {
  const hasContent = generations.length > 0 || isGenerating;

  // Audio uses flex-col list; image/video use grid
  const isAudio = tool === "audio";
  const isVideo = tool === "video";

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white">
      {/* Tabs */}
      <div className="flex items-center gap-4 px-6 h-12 border-b border-[var(--border-subtle)] shrink-0">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            className={
              i === 0
                ? "text-sm font-semibold text-[var(--text-primary)] border-b-2 border-[var(--text-primary)] pb-0.5"
                : "text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            }
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
        {!hasContent ? (
          <EmptyState tool={tool} />
        ) : isAudio ? (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.06 } } }}
            className="flex flex-col gap-2 max-w-lg"
          >
            {generations.map((gen, i) => (
              <MediaCard key={gen.id} generation={gen} index={i} />
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.06 } } }}
            className={
              isVideo
                ? "grid grid-cols-2 gap-3 auto-rows-max"
                : "grid grid-cols-3 gap-2 auto-rows-max"
            }
          >
            {generations.map((gen, i) => (
              <MediaCard key={gen.id} generation={gen} index={i} />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ tool }: { tool: "image" | "video" | "audio" }) {
  const state = EMPTY_STATES[tool];
  const Icon = state.icon;

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl brand-gradient flex items-center justify-center mb-5 opacity-80">
        <Icon className="w-8 h-8 text-white" />
      </div>
      <h3 className="font-semibold text-[var(--text-primary)] mb-2">{state.title}</h3>
      <p className="text-sm text-[var(--text-muted)] max-w-xs leading-relaxed mb-6">
        {state.desc}
      </p>
      {state.placeholders.length > 0 && (
        <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
          {state.placeholders.map((p) => (
            <div
              key={p}
              className="aspect-square rounded-xl shimmer border border-[var(--border-subtle)] flex items-center justify-center p-3"
            >
              <span className="text-[10px] text-[var(--text-muted)] text-center leading-relaxed">
                {p.split(",")[0]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
