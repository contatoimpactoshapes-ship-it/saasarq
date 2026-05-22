"use client";

import { motion } from "framer-motion";
import {
  Layers, Wand2, Video, AudioLines, Box, Package,
  FolderOpen, Clock, ArrowRight,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { CategoryCard } from "@/components/home/CategoryCard";
import { useCreditsStore } from "@/stores/useCreditsStore";

const CATEGORIES = [
  {
    href: "/app/spaces",
    icon: Layers,
    label: "Spaces",
    description: "Sua tela infinita para fluxos de trabalho criativos",
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
  },
  {
    href: "/app/tools/image",
    icon: Wand2,
    label: "Imagem",
    description: "Gere, edite e transforme imagens com IA",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    href: "/app/tools/video",
    icon: Video,
    label: "Vídeo",
    description: "Crie e edite vídeos incríveis com IA generativa",
    iconBg: "bg-green-50",
    iconColor: "text-green-600",
  },
  {
    href: "/app/tools/audio",
    icon: AudioLines,
    label: "Áudio",
    description: "Voz, música e efeitos sonoros com IA",
    iconBg: "bg-teal-50",
    iconColor: "text-teal-600",
  },
  {
    href: "/app/tools/3d",
    icon: Box,
    label: "3D",
    description: "Modelos e cenas 3D gerados por IA",
    iconBg: "bg-gray-100",
    iconColor: "text-gray-600",
  },
  {
    href: "/stock",
    icon: Package,
    label: "Stock",
    description: "Mais de 250 milhões de assets licenciados",
    iconBg: "bg-slate-100",
    iconColor: "text-slate-600",
  },
];

const RECENT_TOOLS = [
  { href: "/app/ai-image-generator",  label: "Gerar imagens",  icon: Wand2 },
  { href: "/app/ai-video-generator",  label: "Gerar vídeos",   icon: Video },
  { href: "/app/voiceover-generator", label: "Texto para voz", icon: AudioLines },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  const { credits, plan } = useCreditsStore();

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar breadcrumb={[{ label: "Início" }]} />

      <div className="flex-1 p-6 space-y-8 max-w-5xl">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">
            Bom dia ✨
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            O que você quer criar hoje?
          </p>
        </motion.div>

        {/* Categories */}
        <section>
          <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">
            Categorias
          </h2>
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
          >
            {CATEGORIES.map((cat) => (
              <motion.div key={cat.href} variants={item}>
                <CategoryCard {...cat} />
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Recentes */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Ferramentas recentes
            </h2>
          </div>
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="flex flex-wrap gap-2"
          >
            {RECENT_TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <motion.a
                  key={tool.href}
                  href={tool.href}
                  variants={item}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border-default)] bg-white hover:border-[var(--text-muted)] hover:shadow-[var(--shadow-card)] transition-all text-sm text-[var(--text-secondary)]"
                >
                  <Icon className="w-4 h-4 text-[var(--color-brand)]" />
                  {tool.label}
                  <ArrowRight className="w-3 h-3 text-[var(--text-muted)]" />
                </motion.a>
              );
            })}
          </motion.div>
        </section>

        {/* Projetos */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5" />
              Projetos recentes
            </h2>
            <a href="/app/projects" className="text-xs text-[var(--color-action)] hover:underline">
              Ver todos
            </a>
          </div>
          <div className="flex flex-col items-center justify-center py-12 border border-dashed border-[var(--border-default)] rounded-2xl text-center">
            <div className="w-12 h-12 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center mb-3">
              <FolderOpen className="w-6 h-6 text-[var(--text-muted)]" />
            </div>
            <p className="text-sm font-medium text-[var(--text-primary)] mb-1">Nenhum projeto ainda</p>
            <p className="text-xs text-[var(--text-muted)]">
              Crie seu primeiro projeto para organizar suas criações
            </p>
          </div>
        </section>

        {/* Upgrade banner se FREE */}
        {plan === "FREE" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-2xl brand-gradient p-6 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div>
              <p className="font-bold text-lg mb-1">Comece a criar com IA</p>
              <p className="text-white/80 text-sm">
                Assine o Essential por R$10/mês e ganhe 8.000 créditos mensais.
              </p>
            </div>
            <a href="/pricing">
              <button className="shrink-0 h-9 px-5 bg-white text-[var(--color-brand)] text-sm font-semibold rounded-full hover:bg-white/90 transition-colors">
                Ver planos
              </button>
            </a>
          </motion.div>
        )}
      </div>
    </div>
  );
}
