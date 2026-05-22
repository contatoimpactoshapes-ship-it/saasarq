"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Wand2, Video, Mic, Music, Zap, Bot, Layers, Image,
  VideoIcon, AudioLines, Box, X, ArrowUpToLine, Scissors,
  Sliders, Sparkles, ScanFace, Camera, Sun, Package2,
  PenTool, Copy, Volume2, Headphones,
} from "lucide-react";

interface Tool {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

const TOOL_SECTIONS: { category: string; color: string; tools: Tool[] }[] = [
  {
    category: "Imagem",
    color: "text-blue-600",
    tools: [
      { href: "/app/ai-image-generator",  label: "Gerar imagens",   icon: Wand2 },
      { href: "/app/image-editor",        label: "Editor de imagem", icon: Sliders },
      { href: "/app/tools/upscaler",      label: "Upscaler",         icon: ArrowUpToLine },
      { href: "/app/tools/variations",    label: "Variações",        icon: Copy },
      { href: "/app/tools/cinematic-shot",label: "Efeito cinema",    icon: Sparkles },
      { href: "/app/tools/skin-enhancer", label: "Skin enhancer",    icon: ScanFace },
      { href: "/app/tools/change-camera", label: "Trocar câmera",    icon: Camera },
      { href: "/app/tools/relight",       label: "Relight",          icon: Sun },
      { href: "/app/mockup",             label: "Mockup",            icon: Package2 },
      { href: "/app/sketch",             label: "Sketch",            icon: PenTool },
    ],
  },
  {
    category: "Vídeo",
    color: "text-green-600",
    tools: [
      { href: "/app/ai-video-generator",  label: "Gerar vídeos",     icon: Video },
      { href: "/app/video-editor",        label: "Editor de vídeo",  icon: Scissors },
      { href: "/app/video-modify",        label: "Modificar vídeo",  icon: VideoIcon },
      { href: "/app/tools/video-upscaler",label: "Video Upscaler",   icon: ArrowUpToLine },
      { href: "/app/tools/video-relight", label: "Video Relight",    icon: Sun },
      { href: "/app/tools/speak",         label: "Falar em vídeo",   icon: Mic },
    ],
  },
  {
    category: "Áudio",
    color: "text-teal-600",
    tools: [
      { href: "/app/voiceover-generator", label: "Texto para voz",   icon: Mic },
      { href: "/app/soundfx-generator",   label: "Efeitos sonoros",  icon: Volume2 },
      { href: "/app/music",              label: "Música",            icon: Music },
      { href: "/app/tools/voice-changer", label: "Troca de voz",     icon: Headphones },
    ],
  },
  {
    category: "3D",
    color: "text-gray-600",
    tools: [
      { href: "/app/tools/image-to-3d",  label: "Imagem para 3D",   icon: Box },
      { href: "/app/tools/3d-scenes",    label: "Cenas 3D",          icon: Layers },
    ],
  },
  {
    category: "Ferramentas",
    color: "text-purple-600",
    tools: [
      { href: "/app/spaces",   label: "Spaces",      icon: Layers, badge: "Novo" },
      { href: "/app/assistant",label: "Assistente",  icon: Bot },
    ],
  },
];

interface ToolsMenuProps {
  onClose: () => void;
  collapsed: boolean;
}

export function ToolsMenu({ onClose, collapsed }: ToolsMenuProps) {
  const left = collapsed ? "56px" : "220px";

  return (
    <>
      <div
        className="fixed inset-0 z-30 bg-[var(--overlay-light)]"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -8 }}
        transition={{ duration: 0.15 }}
        className="fixed top-0 bottom-0 z-40 w-72 bg-white border-r border-[var(--border-default)] overflow-y-auto scrollbar-thin"
        style={{ left }}
      >
        <div className="flex items-center justify-between px-4 h-14 border-b border-[var(--border-subtle)]">
          <span className="font-semibold text-sm text-[var(--text-primary)]">Todas as ferramentas</span>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 space-y-4">
          {TOOL_SECTIONS.map((section) => (
            <div key={section.category}>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-2 px-2 ${section.color}`}>
                {section.category}
              </p>
              <div className="space-y-0.5">
                {section.tools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <Link key={tool.href} href={tool.href} onClick={onClose}>
                      <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors group">
                        <Icon className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] shrink-0" />
                        <span className="text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] flex-1">
                          {tool.label}
                        </span>
                        {tool.badge && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full brand-gradient text-white">
                            {tool.badge}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </>
  );
}
