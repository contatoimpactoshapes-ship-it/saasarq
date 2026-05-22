"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { FolderOpen, Download, Plus, Loader2 } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import type { GenerationItem } from "@/stores/useGenerationStore";

async function fetchGenerations(): Promise<GenerationItem[]> {
  const res = await fetch("/api/generations");
  if (!res.ok) return [];
  return res.json();
}

export default function ProjectsPage() {
  const [generations, setGenerations] = useState<GenerationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGenerations()
      .then(setGenerations)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar breadcrumb={[{ label: "Projetos" }]} />

      <div className="flex-1 p-6 max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Projetos</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Histórico de todas as suas gerações
            </p>
          </div>
          <a href="/app/ai-image-generator">
            <button className="h-9 px-4 flex items-center gap-2 rounded-xl brand-gradient text-white text-sm font-semibold hover:opacity-90 transition-opacity">
              <Plus className="w-4 h-4" />
              Nova geração
            </button>
          </a>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
          </div>
        )}

        {!loading && generations.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 border border-dashed border-[var(--border-default)] rounded-2xl text-center"
          >
            <div className="w-12 h-12 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center mb-3">
              <FolderOpen className="w-6 h-6 text-[var(--text-muted)]" />
            </div>
            <p className="text-sm font-medium text-[var(--text-primary)] mb-1">Nenhum projeto ainda</p>
            <p className="text-xs text-[var(--text-muted)] mb-4">
              Crie sua primeira geração para ver aqui
            </p>
            <a href="/app/ai-image-generator">
              <button className="h-8 px-4 rounded-xl brand-gradient text-white text-xs font-semibold hover:opacity-90 transition-opacity">
                Gerar imagem
              </button>
            </a>
          </motion.div>
        )}

        {!loading && generations.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
          >
            {generations.map((gen, i) => (
              <motion.div
                key={gen.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                className="group rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-white hover:shadow-[var(--shadow-card)] transition-all"
              >
                {gen.outputUrls[0] ? (
                  <div className="relative aspect-square overflow-hidden bg-[var(--bg-secondary)]">
                    <Image
                      src={gen.outputUrls[0]}
                      alt={gen.prompt}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <a
                      href={gen.outputUrls[0]}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 p-1.5 rounded-lg"
                    >
                      <Download className="w-3.5 h-3.5 text-white" />
                    </a>
                  </div>
                ) : (
                  <div className="aspect-square bg-[var(--bg-secondary)] shimmer flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-[var(--text-muted)] animate-spin" />
                  </div>
                )}
                <div className="p-2.5">
                  <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                    {gen.prompt}
                  </p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] text-[var(--text-muted)] truncate max-w-[80px]">
                      {gen.tool === "IMAGE_EDIT" ? "Render 3D"
                        : gen.tool === "VIDEO_GENERATE" ? "Vídeo"
                        : gen.tool === "AUDIO_TTS" ? "Narração"
                        : gen.model}
                    </span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      gen.status === "COMPLETED"
                        ? "bg-emerald-50 text-emerald-700"
                        : gen.status === "FAILED"
                        ? "bg-red-50 text-red-700"
                        : "bg-[var(--bg-secondary)] text-[var(--text-muted)]"
                    }`}>
                      {gen.status === "COMPLETED" ? "Concluído"
                        : gen.status === "FAILED" ? "Falhou"
                        : "Processando"}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
