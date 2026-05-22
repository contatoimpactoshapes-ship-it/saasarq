"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

const DEFAULT_PINNED = [
  "IMAGE_GENERATE",
  "VIDEO_GENERATE",
  "AUDIO_TTS",
];

interface SidebarState {
  collapsed: boolean;
  showAllTools: boolean;
  pinnedTools: string[];
  toggle: () => void;
  setCollapsed: (v: boolean) => void;
  toggleAllTools: () => void;
  setShowAllTools: (v: boolean) => void;
  pinTool: (tool: string) => void;
  unpinTool: (tool: string) => void;
  isPinned: (tool: string) => boolean;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set, get) => ({
      collapsed: false,
      showAllTools: false,
      pinnedTools: DEFAULT_PINNED,

      toggle: () => set((s) => ({ collapsed: !s.collapsed })),
      setCollapsed: (collapsed) => set({ collapsed }),
      toggleAllTools: () => set((s) => ({ showAllTools: !s.showAllTools })),
      setShowAllTools: (showAllTools) => set({ showAllTools }),

      pinTool: (tool) =>
        set((s) => ({
          pinnedTools: s.pinnedTools.includes(tool)
            ? s.pinnedTools
            : [...s.pinnedTools, tool],
        })),

      unpinTool: (tool) =>
        set((s) => ({
          pinnedTools: s.pinnedTools.filter((t) => t !== tool),
        })),

      isPinned: (tool) => get().pinnedTools.includes(tool),
    }),
    { name: "saasarq-sidebar" }
  )
);
