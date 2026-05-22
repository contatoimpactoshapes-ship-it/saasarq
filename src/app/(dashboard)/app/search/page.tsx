"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Wand2, Video, Mic, Box } from "lucide-react";
import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";

const ALL_TOOLS = [
  { href: "/app/ai-image-generator",  label: "Gerar Imagens",   icon: Wand2,  category: "Imagem" },
  { href: "/app/ai-video-generator",  label: "Gerar Vídeo",     icon: Video,  category: "Vídeo" },
  { href: "/app/voiceover-generator", label: "Texto para Voz",  icon: Mic,    category: "Áudio" },
  { href: "/app/tools/image",         label: "Ferramentas de Imagem", icon: Wand2, category: "Imagem" },
  { href: "/app/tools/video",         label: "Ferramentas de Vídeo",  icon: Video, category: "Vídeo" },
  { href: "/app/tools/audio",         label: "Ferramentas de Áudio",  icon: Mic,   category: "Áudio" },
  { href: "/app/tools/3d",            label: "Ferramentas 3D",         icon: Box,   category: "3D" },
];

export default function SearchPage() {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? ALL_TOOLS.filter((t) =>
        t.label.toLowerCase().includes(query.toLowerCase()) ||
        t.category.toLowerCase().includes(query.toLowerCase())
      )
    : ALL_TOOLS;

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar breadcrumb={[{ label: "Pesquisar" }]} showBanner={false} />

      <div className="flex-1 p-6 max-w-2xl space-y-5">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar ferramentas, criações..."
            autoFocus
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-[var(--border-default)] bg-white text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-brand)] transition-colors"
          />
        </div>

        {query && (
          <p className="text-xs text-[var(--text-muted)]">
            {filtered.length} resultado{filtered.length !== 1 ? "s" : ""} para &ldquo;{query}&rdquo;
          </p>
        )}

        <motion.div
          key={query}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-1"
        >
          {filtered.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.href}
                href={tool.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--bg-secondary)] transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] group-hover:bg-white flex items-center justify-center shrink-0 transition-colors">
                  <Icon className="w-4 h-4 text-[var(--text-muted)]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{tool.label}</p>
                  <p className="text-xs text-[var(--text-muted)]">{tool.category}</p>
                </div>
              </Link>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
