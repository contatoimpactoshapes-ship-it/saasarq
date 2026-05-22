"use client";

import { motion } from "framer-motion";
import {
  Wand2, Pencil, ZoomIn, Expand, Layers, Film,
  Sparkles, Camera, Sun, Scissors, ArrowRight, Box,
} from "lucide-react";
import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";

const TOOLS = [
  {
    href: "/app/ai-image-generator",
    icon: Wand2,
    label: "Gerar Imagens",
    description: "Crie imagens fotorrealistas a partir de texto com IA",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    available: true,
    badge: null,
  },
  {
    href: "/app/ai-image-generator?mode=render3d",
    icon: Box,
    label: "Renderizar 3D",
    description: "Transforme modelos 3D (SketchUp, Revit, ArqCAD) em renderizações fotorrealistas",
    iconBg: "bg-pink-50",
    iconColor: "text-pink-600",
    available: true,
    badge: "Novo",
  },
  {
    href: "/app/tools/image/edit",
    icon: Pencil,
    label: "Editar Imagem",
    description: "Edite e retoque imagens existentes com IA",
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
    available: false,
    badge: null,
  },
  {
    href: "/app/tools/image/upscale",
    icon: ZoomIn,
    label: "Ampliar Imagem",
    description: "Aumente a resolução sem perder qualidade",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    available: false,
  },
  {
    href: "/app/tools/image/expand",
    icon: Expand,
    label: "Expandir Imagem",
    description: "Amplie a tela da imagem com outpainting",
    iconBg: "bg-cyan-50",
    iconColor: "text-cyan-600",
    available: false,
  },
  {
    href: "/app/tools/image/variations",
    icon: Layers,
    label: "Variações",
    description: "Gere variações criativas de uma imagem",
    iconBg: "bg-orange-50",
    iconColor: "text-orange-600",
    available: false,
  },
  {
    href: "/app/tools/image/cinematic",
    icon: Film,
    label: "Cinemático",
    description: "Aplique efeitos cinematográficos profissionais",
    iconBg: "bg-red-50",
    iconColor: "text-red-600",
    available: false,
  },
  {
    href: "/app/tools/image/skin",
    icon: Sparkles,
    label: "Retocar Pele",
    description: "Retoques naturais de pele com IA",
    iconBg: "bg-pink-50",
    iconColor: "text-pink-600",
    available: false,
  },
  {
    href: "/app/tools/image/camera",
    icon: Camera,
    label: "Mover Câmera",
    description: "Gere perspectivas 3D a partir de uma imagem",
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-600",
    available: false,
  },
  {
    href: "/app/tools/image/relight",
    icon: Sun,
    label: "Reilluminar",
    description: "Altere a iluminação de qualquer imagem",
    iconBg: "bg-yellow-50",
    iconColor: "text-yellow-600",
    available: false,
  },
  {
    href: "/app/tools/image/background",
    icon: Scissors,
    label: "Remover Fundo",
    description: "Remova o fundo de imagens automaticamente",
    iconBg: "bg-slate-50",
    iconColor: "text-slate-600",
    available: false,
  },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

export default function ImageToolsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <TopBar breadcrumb={[{ label: "Ferramentas" }, { label: "Imagem" }]} />

      <div className="flex-1 p-6 max-w-4xl space-y-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Ferramentas de Imagem</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Gere, edite e transforme imagens com IA generativa
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
                  <Link href={tool.href} className="group relative block p-4 rounded-xl border border-[var(--border-default)] bg-white hover:border-[var(--color-brand)] hover:shadow-[var(--shadow-card)] transition-all">
                    {tool.badge && (
                      <span className="absolute top-3 right-3 text-[10px] font-semibold px-1.5 py-0.5 rounded-full brand-gradient text-white">
                        {tool.badge}
                      </span>
                    )}
                    <div className={`w-10 h-10 rounded-xl ${tool.iconBg} flex items-center justify-center mb-3`}>
                      <Icon className={`w-5 h-5 ${tool.iconColor}`} />
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm text-[var(--text-primary)]">{tool.label}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">{tool.description}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[var(--color-brand)] mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                ) : (
                  <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] opacity-55 cursor-not-allowed">
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
