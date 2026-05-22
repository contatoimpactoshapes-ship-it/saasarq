"use client";

import { create } from "zustand";
import type { PlanId } from "@/lib/plans";

interface CreditsState {
  credits: number;
  plan: PlanId;
  isLoading: boolean;
  setCredits: (credits: number) => void;
  setPlan: (plan: PlanId) => void;
  setLoading: (v: boolean) => void;
  decrementCredits: (amount: number) => void;
  refreshCredits: () => Promise<void>;
}

export const useCreditsStore = create<CreditsState>((set) => ({
  credits: 0,
  plan: "FREE",
  isLoading: true,

  setCredits: (credits) => set({ credits }),
  setPlan: (plan) => set({ plan }),
  setLoading: (isLoading) => set({ isLoading }),
  decrementCredits: (amount) =>
    set((state) => ({ credits: Math.max(0, state.credits - amount) })),

  refreshCredits: async () => {
    try {
      const res = await fetch("/api/credits");
      if (res.ok) {
        const data = await res.json();
        set({ credits: data.credits, plan: data.plan as PlanId, isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
