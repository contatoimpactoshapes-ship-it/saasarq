"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { UserButton } from "@clerk/nextjs";
import {
  Home, Search, Package, Globe, FolderOpen, LayoutGrid,
  Wand2, Video, Mic, Bot, ChevronLeft, ChevronRight,
  Bell, Settings, GraduationCap, Plus, Layers, Box,
  Pin, PinOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/stores/useSidebarStore";
import { useCreditsStore } from "@/stores/useCreditsStore";
import { PLAN_LABELS, PLAN_CREDITS } from "@/lib/plans";
import { ToolsMenu } from "./ToolsMenu";

const NAV_ITEMS = [
  { href: "/app",             label: "Início",     icon: Home },
  { href: "/app/search",      label: "Pesquisar",  icon: Search },
  { href: "/stock",           label: "Stock",      icon: Package },
  { href: "/app/community",   label: "Comunidade", icon: Globe },
  { href: "/app/projects",    label: "Projetos",   icon: FolderOpen },
];

const TOOL_ITEMS = [
  { tool: "IMAGE_GENERATE", href: "/app/ai-image-generator",             label: "Gerar imagens",  icon: Wand2 },
  { tool: "IMAGE_EDIT",     href: "/app/ai-image-generator?mode=render3d", label: "Renderizar 3D",  icon: Box },
  { tool: "VIDEO_GENERATE", href: "/app/ai-video-generator",             label: "Gerar vídeos",   icon: Video },
  { tool: "AUDIO_TTS",      href: "/app/voiceover-generator",            label: "Texto para voz", icon: Mic },
  { tool: "ASSISTANT",      href: "/app/assistant",                       label: "Assistente",     icon: Bot },
  { tool: "SPACES",         href: "/app/spaces",                          label: "Spaces",         icon: Layers },
];

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, toggle, showAllTools, toggleAllTools, pinnedTools, pinTool, unpinTool, isPinned } = useSidebarStore();
  const { credits, plan } = useCreditsStore();

  const w = collapsed ? "56px" : "220px";

  return (
    <>
      <motion.aside
        animate={{ width: w }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        className="fixed inset-y-0 left-0 z-40 flex flex-col bg-white border-r border-[var(--border-default)] overflow-hidden"
        style={{ width: w }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 h-14 border-b border-[var(--border-subtle)] shrink-0">
          {!collapsed && (
            <Link href="/app" className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg brand-gradient flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-xs">M</span>
              </div>
              <span className="font-semibold text-sm text-[var(--text-primary)] truncate">SaasArq</span>
            </Link>
          )}
          {collapsed && (
            <button
              onClick={toggle}
              className="w-7 h-7 rounded-lg brand-gradient flex items-center justify-center mx-auto hover:opacity-90 transition-opacity"
              title="Expandir sidebar"
            >
              <span className="text-white font-bold text-xs">M</span>
            </button>
          )}
          {!collapsed && (
            <button
              onClick={toggle}
              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-muted)] transition-colors shrink-0"
              title="Recolher sidebar"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Create button */}
        <div className="px-2 pt-3 pb-2 shrink-0">
          {collapsed ? (
            <button
              onClick={() => {}}
              className="w-9 h-9 brand-gradient rounded-lg flex items-center justify-center mx-auto hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4 text-white" />
            </button>
          ) : (
            <Link href="/app/ai-image-generator">
              <button className="w-full h-9 brand-gradient rounded-lg flex items-center justify-center gap-2 text-white text-sm font-medium hover:opacity-90 transition-opacity">
                <Plus className="w-4 h-4" />
                Criar
              </button>
            </Link>
          )}
        </div>

        {/* Main nav */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <SidebarItem icon={<Icon className="w-4 h-4" />} label={item.label} active={active} collapsed={collapsed} />
              </Link>
            );
          })}

          {/* Divider */}
          <div className="my-2 border-t border-[var(--border-subtle)]" />

          {/* All tools */}
          <button
            onClick={toggleAllTools}
            className="w-full"
          >
            <SidebarItem
              icon={<LayoutGrid className="w-4 h-4" />}
              label="Todas as ferramentas"
              active={showAllTools}
              collapsed={collapsed}
            />
          </button>

          {/* Pinned / default tools */}
          {TOOL_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            const pinned = isPinned(item.tool);
            return (
              <div key={item.href} className="relative group">
                <Link href={item.href}>
                  <SidebarItem
                    icon={<Icon className="w-4 h-4" />}
                    label={item.label}
                    active={active}
                    collapsed={collapsed}
                  />
                </Link>
                {!collapsed && (
                  <button
                    onClick={() => pinned ? unpinTool(item.tool) : pinTool(item.tool)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    {pinned ? <Pin className="w-3 h-3 fill-current" /> : <PinOff className="w-3 h-3" />}
                  </button>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-2 py-3 border-t border-[var(--border-subtle)] shrink-0 space-y-1">
          {/* Credits */}
          {!collapsed && (
            <Link href="/pricing">
              <div className="px-3 py-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors cursor-pointer">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[var(--text-muted)]">{PLAN_LABELS[plan as keyof typeof PLAN_LABELS] ?? plan}</span>
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    {credits.toLocaleString("pt-BR")} cr
                  </span>
                </div>
                <div className="h-1 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                  <div
                    className="h-full brand-gradient rounded-full"
                    style={{ width: `${Math.min((credits / Math.max(PLAN_CREDITS[plan] || 8000, 1)) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </Link>
          )}
          <div className="flex items-center gap-1 px-1">
            <FooterBtn icon={<GraduationCap className="w-4 h-4" />} collapsed={collapsed} />
            <FooterBtn icon={<Bell className="w-4 h-4" />} collapsed={collapsed} />
            <FooterBtn icon={<Settings className="w-4 h-4" />} collapsed={collapsed} />
            <div className={cn("ml-auto", collapsed && "mx-auto")}>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
          {collapsed && (
            <button
              onClick={toggle}
              className="w-full flex items-center justify-center py-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </motion.aside>

      {/* All Tools overlay */}
      <AnimatePresence>
        {showAllTools && (
          <ToolsMenu
            onClose={() => toggleAllTools()}
            collapsed={collapsed}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function SidebarItem({
  icon,
  label,
  active,
  collapsed,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
        active
          ? "bg-[var(--bg-secondary)] text-[var(--text-primary)] font-medium"
          : "text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]",
        collapsed && "justify-center px-2"
      )}
    >
      <span className="shrink-0">{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </div>
  );
}

function FooterBtn({
  icon,
  collapsed,
  badge,
  onClick,
}: {
  icon: React.ReactNode;
  collapsed: boolean;
  badge?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
    >
      {icon}
      {badge && (
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 text-[9px] font-bold brand-gradient text-white rounded-full flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  );
}
