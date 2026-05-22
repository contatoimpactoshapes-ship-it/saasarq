"use client";

import { create } from "zustand";

export interface GenerationItem {
  id: string;
  tool: string;
  model: string;
  prompt: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  outputUrls: string[];
  creditsCost: number;
  errorMessage?: string | null;
  createdAt: string;
}

interface GenerationState {
  generations: GenerationItem[];
  isGenerating: boolean;
  currentId: string | null;
  pollingRef: ReturnType<typeof setInterval> | null;

  addGeneration: (g: GenerationItem) => void;
  updateGeneration: (id: string, data: Partial<GenerationItem>) => void;
  setIsGenerating: (v: boolean) => void;
  setCurrentId: (id: string | null) => void;
  setPollingRef: (ref: ReturnType<typeof setInterval> | null) => void;
  clearPolling: () => void;
  reset: () => void;
}

export const useGenerationStore = create<GenerationState>((set, get) => ({
  generations: [],
  isGenerating: false,
  currentId: null,
  pollingRef: null,

  addGeneration: (g) =>
    set((s) => ({ generations: [g, ...s.generations] })),

  updateGeneration: (id, data) =>
    set((s) => ({
      generations: s.generations.map((g) =>
        g.id === id ? { ...g, ...data } : g
      ),
    })),

  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setCurrentId: (currentId) => set({ currentId }),
  setPollingRef: (pollingRef) => set({ pollingRef }),

  clearPolling: () => {
    const { pollingRef } = get();
    if (pollingRef) clearInterval(pollingRef);
    set({ pollingRef: null, isGenerating: false, currentId: null });
  },

  reset: () =>
    set({ generations: [], isGenerating: false, currentId: null }),
}));
