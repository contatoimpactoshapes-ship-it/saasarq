"use client";

import { motion } from "framer-motion";
import { Mic, Music, Zap, User, ArrowRight } from "lucide-react";
import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";

const TOOLS = [
  {
    href: "/app/voiceover-generator",
    icon: Mic,
    label: "Texto para Voz",
    description: "Converta texto em narração natural com IA",
    iconBg: "bg-teal-50",
    iconColor: "text-teal-600",
    available: true,
  },
  {
    href: "/app/tools/audio/music",
    icon: Music,
    label: "Música",
    description: "Gere trilhas musicais originais com IA",
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
    available: false,
  },
  {
    href: "/app/tools/audio/sfx",
    icon: Zap,
    label: "Efeitos Sonoros",
    description: "Crie efeitos sonoros personalizados",
    iconBg: "bg-orange-50",
    iconColor: "text-orange-600",
    available: false,
  },
  {
    href: "/app/tools/audio/clone",
    icon: User,
    label: "Clonar Voz",
    description: "Clone qualquer voz com apenas 30 segundos de áudio",
    iconBg: "bg-red-50",
    iconColor: "text-red-600",
    available: false,
  },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

export default function AudioToolsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <TopBar breadcrumb={[{ label: "Ferramentas" }, { label: "Áudio" }]} />

      <div className="flex-1 p-6 max-w-4xl space-y-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Ferramentas de Áudio</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Voz, música e efeitos sonoros com IA
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
