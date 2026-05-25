import { PLANS } from "@/lib/plans";
import type { PlanId } from "@/lib/plans";

// ── Credit-to-revenue rate ────────────────────────────────────────────────────
// BRL earned per credit spent, derived from monthly plan price / monthly credits.
// Free users = R$0/credit: their generations are pure cost to the platform.
export const CREDIT_VALUE_BRL: Record<string, number> = Object.fromEntries(
  PLANS.map((p) => [
    p.id,
    p.credits > 0 ? +(p.priceMonthly / p.credits).toFixed(8) : 0,
  ])
);

// USD/gen threshold above which a model is "expensive" → stricter protections
export const EXPENSIVE_MODEL_USD = 0.08;

// Credits-used fraction above which expensive model access is soft-blocked
export const OVERAGE_THRESHOLD_PCT = 0.80;

// Cumulative margin below this BRL value → user classified as deficit customer
export const DEFICIT_ALERT_THRESHOLD_BRL = -5.0;

// Minimum minutes between VIDEO_GENERATE calls per plan (0 = no cooldown)
export const VIDEO_COOLDOWN_MINUTES: Record<string, number> = {
  FREE:         60,
  ESSENTIAL:    30,
  PREMIUM:      15,
  PREMIUM_PLUS: 5,
  PRO:          0,
};

// ── Feature flags ─────────────────────────────────────────────────────────────

export interface PlanFeatureFlags {
  videoGenerate: boolean;
  audioGenerate: boolean;
  spaces:        boolean;
  inpaint:       boolean;
  upscale:       boolean;
  creditPacks:   boolean;
  priorityQueue: boolean;
}

export const PLAN_FEATURES: Record<string, PlanFeatureFlags> = {
  FREE: {
    videoGenerate: false,
    audioGenerate: false,
    spaces:        false,
    inpaint:       false,
    upscale:       false,
    creditPacks:   false,
    priorityQueue: false,
  },
  ESSENTIAL: {
    videoGenerate: true,
    audioGenerate: true,
    spaces:        true,
    inpaint:       true,
    upscale:       false,
    creditPacks:   true,
    priorityQueue: false,
  },
  PREMIUM: {
    videoGenerate: true,
    audioGenerate: true,
    spaces:        true,
    inpaint:       true,
    upscale:       false,
    creditPacks:   true,
    priorityQueue: false,
  },
  PREMIUM_PLUS: {
    videoGenerate: true,
    audioGenerate: true,
    spaces:        true,
    inpaint:       true,
    upscale:       true,
    creditPacks:   true,
    priorityQueue: false,
  },
  PRO: {
    videoGenerate: true,
    audioGenerate: true,
    spaces:        true,
    inpaint:       true,
    upscale:       true,
    creditPacks:   true,
    priorityQueue: true,
  },
};

export function getPlanFeatures(planId: string): PlanFeatureFlags {
  return PLAN_FEATURES[planId] ?? PLAN_FEATURES["FREE"];
}

// ── Credit Packs ──────────────────────────────────────────────────────────────
// Purchasable on top of subscription. Pricing set for ~80 %+ margin per pack.

export interface CreditPack {
  id:       string;
  name:     string;
  credits:  number;
  bonus:    number;    // bonus credits included at no extra cost
  priceBRL: number;
  minPlan:  PlanId;
}

export const CREDIT_PACKS: CreditPack[] = [
  { id: "pack-starter",    name: "Starter",    credits: 5_000,   bonus: 0,      priceBRL: 25,  minPlan: "ESSENTIAL" },
  { id: "pack-boost",      name: "Boost",      credits: 15_000,  bonus: 1_000,  priceBRL: 65,  minPlan: "ESSENTIAL" },
  { id: "pack-power",      name: "Power",      credits: 50_000,  bonus: 5_000,  priceBRL: 199, minPlan: "PREMIUM"   },
  { id: "pack-enterprise", name: "Enterprise", credits: 200_000, bonus: 30_000, priceBRL: 699, minPlan: "PRO"       },
];
