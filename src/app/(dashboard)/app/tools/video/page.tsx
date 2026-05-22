"use client";

import { motion } from "framer-motion";
import { Video, Pencil, ZoomIn, Sun, ArrowRight, RotateCcw, Clapperboard } from "lucide-react";
import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";

const TOOLS = [
  {
    href: "/app/ai-video-generator",
    icon: Video,
    label: "Gerar Vídeo",
    description: "Crie vídeos impressionantes a partir de texto",
    iconBg: "bg-green-50",
    iconColor: "text-green-600",
    available: true,
  },
  {
    href: "/app/tools/video/edit",
    icon: Pencil,
    label: "Editar Vídeo",
    description: "Edite e combine clipes com IA",
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
    available: false,
  },
  {
    href: "/app/tools/video/upscale",
    icon: ZoomIn,
    label: "Ampliar Vídeo",
    description: "Aumente a resolução de vídeos existentes",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    available: false,
  },
  {
    href: "/app/tools/video/relight",
    icon: Sun,
    label: "Reilluminar Vídeo",
    description: "Altere a iluminação de clipes de vídeo",
    iconBg: "bg-yellow-50",
    iconColor: "text-yellow-600",
    available: false,
  },
  {
    href: "/app/tools/video/loop",
    icon: RotateCcw,
    label: "Vídeo em Loop",
    description: "Crie loops perfeitos a partir de qualquer vídeo",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    available: false,
  },
  {
    href: "/app/tools/video/storyboard",
    icon: Clapperboard,
    label: "Storyboard",
    description: "Gere storyboards animados automaticamente",
    iconBg: "bg-orange-50",
    iconColor: "text-orange-600",
    available: false,
  },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

export default function VideoToolsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <TopBar breadcrumb={[{ label: "Ferramentas" }, { label: "Vídeo" }]} />

      <div className="flex-1 p-6 max-w-4xl space-y-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Ferramentas de Vídeo</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Crie e edite vídeos incríveis com IA generativa
          </p>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
        >
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <motion.div key={tool.href} variants={item}>
                {tool.available ? (
                  <Link href={tool.href} className="group block p-4 rounded-xl border border-[var(--border-default)] bg-white hover:border-[var(--text-muted)] hover:shadow-[var(--shadow-card)] transition-all">
                    <div className={`w-10 h-10 rounded-xl ${tool.iconBg} flex items-center justify-center mb-3`}>
                      <Icon className={`w-5 h-5 ${tool.iconColor}`} />
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm text-[var(--text-primary)]">{tool.label}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">{tool.description}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[var(--text-muted)] mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                ) : (
                  <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] opacity-60 cursor-not-allowed">
                    <div className={`w-10 h-10 rounded-xl ${tool.iconBg} flex items-center justify-center mb-3`}>
                      <Icon className={`w-5 h-5 ${tool.iconColor}`} />
                    </div>
                    <p className="font-semibold text-sm text-[var(--text-primary)]">{tool.label}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">{tool.description}</p>
                    <span className="inline-block mt-2 text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--border-default)] text-[var(--text-muted)] font-medium">
                      Em breve
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
