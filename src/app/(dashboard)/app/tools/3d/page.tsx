"use client";

import { motion } from "framer-motion";
import { Box, Globe, ArrowRight } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";

const TOOLS = [
  {
    href: "/app/tools/3d/model",
    icon: Box,
    label: "Modelo 3D",
    description: "Gere modelos 3D a partir de imagens ou texto",
    iconBg: "bg-gray-100",
    iconColor: "text-gray-600",
    available: false,
  },
  {
    href: "/app/tools/3d/scenes",
    icon: Globe,
    label: "Cenas 3D",
    description: "Crie cenas e ambientes 3D completos",
    iconBg: "bg-slate-100",
    iconColor: "text-slate-600",
    available: false,
  },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

export default function ThreeDToolsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <TopBar breadcrumb={[{ label: "Ferramentas" }, { label: "3D" }]} />

      <div className="flex-1 p-6 max-w-4xl space-y-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Ferramentas 3D</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Modelos e cenas 3D gerados por IA
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
              </motion.div>
            );
          })}
        </motion.div>

        {/* Coming soon banner */}
        <div className="rounded-2xl brand-gradient p-6 text-white text-center">
          <p className="font-bold text-lg mb-1">3D está chegando</p>
          <p className="text-white/80 text-sm">
            Estamos construindo as ferramentas 3D mais poderosas do mercado.
            Fique ligado para o lançamento em breve.
          </p>
        </div>
      </div>
    </div>
  );
}
