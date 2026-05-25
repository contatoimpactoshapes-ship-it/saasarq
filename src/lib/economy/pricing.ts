import { PLANS } from "@/lib/plans";
import type { PlanId } from "@/lib/plans";

// ── Retail anchor ─────────────────────────────────────────────────────────────
// Official rate approved: 1000 credits = R$ 39.
// Plan subscriptions give credits at deep discount; packs sell at this retail rate.
export const RETAIL_BRL_PER_1K = 39;
export const RETAIL_BRL_PER_CREDIT = RETAIL_BRL_PER_1K / 1000; // R$ 0.039

// ── Credit-to-subscription-revenue rate ───────────────────────────────────────
// BRL earned per credit spent at subscription level (monthly price / credits).
// Free users = R$0 — every generation is pure cost.
export const CREDIT_VALUE_BRL: Record<string, number> = Object.fromEntries(
  PLANS.map((p) => [
    p.id,
    p.credits > 0 ? +(p.priceMonthly / p.credits).toFixed(8) : 0,
  ])
);

// ── Expensive model threshold ─────────────────────────────────────────────────
// USD/gen above which stricter rate-limiting applies
export const EXPENSIVE_MODEL_USD = 0.08;

// ── Overage protection ────────────────────────────────────────────────────────
// Credit-used fraction above which expensive models are soft-blocked
export const OVERAGE_THRESHOLD_PCT = 0.80;

// ── Deficit threshold ─────────────────────────────────────────────────────────
// Cumulative margin below this BRL → user flagged as deficit customer
export const DEFICIT_ALERT_THRESHOLD_BRL = -5.0;

// ── Low balance warning ───────────────────────────────────────────────────────
// Fraction of plan allocation remaining that triggers UI warning
export const LOW_BALANCE_THRESHOLD_PCT = 0.20;

// ── Video cooldown ────────────────────────────────────────────────────────────
// Minimum minutes between VIDEO_GENERATE calls per plan (0 = no cooldown)
export const VIDEO_COOLDOWN_MINUTES: Record<string, number> = {
  FREE:         60,
  ESSENTIAL:    30,
  PREMIUM:      15,
  PREMIUM_PLUS: 5,
  PRO:          0,
};

// ── Concurrency limits ────────────────────────────────────────────────────────
// Max simultaneous PENDING + PROCESSING generations per plan
export const CONCURRENCY_LIMITS: Record<string, number> = {
  FREE:         1,
  ESSENTIAL:    1,
  PREMIUM:      2,
  PREMIUM_PLUS: 3,
  PRO:          5,
};

// ── Rollover strategy ─────────────────────────────────────────────────────────
// Fraction of unused credits that carry forward to next billing cycle.
// 0 = credits expire; 1 = unlimited rollover.
export const ROLLOVER_PCT: Record<string, number> = {
  FREE:         0,
  ESSENTIAL:    0,     // credits reset monthly
  PREMIUM:      0.20,  // up to 20% carries forward (max 4k credits)
  PREMIUM_PLUS: 0.30,  // up to 30% carries forward (max 13.5k credits)
  PRO:          1,     // unlimited rollover, credits never expire
};

// ── Feature flags ─────────────────────────────────────────────────────────────

export interface PlanFeatureFlags {
  videoGenerate:   boolean;
  audioGenerate:   boolean;
  spaces:          boolean;
  inpaint:         boolean;
  upscale:         boolean;
  creditPacks:     boolean;
  priorityQueue:   boolean;
  soraAccess:      boolean;  // Sora 2 is PRO-only
  premiumVideos:   boolean;  // kling-2.1-pro, runway — require PREMIUM_PLUS+
}

export const PLAN_FEATURES: Record<string, PlanFeatureFlags> = {
  FREE: {
    videoGenerate:  false,
    audioGenerate:  false,
    spaces:         false,
    inpaint:        false,
    upscale:        false,
    creditPacks:    false,
    priorityQueue:  false,
    soraAccess:     false,
    premiumVideos:  false,
  },
  ESSENTIAL: {
    videoGenerate:  true,   // hunyuan only (cheapest video)
    audioGenerate:  true,
    spaces:         true,
    inpaint:        true,
    upscale:        false,
    creditPacks:    true,
    priorityQueue:  false,
    soraAccess:     false,
    premiumVideos:  false,
  },
  PREMIUM: {
    videoGenerate:  true,
    audioGenerate:  true,
    spaces:         true,
    inpaint:        true,
    upscale:        false,
    creditPacks:    true,
    priorityQueue:  false,
    soraAccess:     false,
    premiumVideos:  false,
  },
  PREMIUM_PLUS: {
    videoGenerate:  true,
    audioGenerate:  true,
    spaces:         true,
    inpaint:        true,
    upscale:        true,
    creditPacks:    true,
    priorityQueue:  false,
    soraAccess:     false,
    premiumVideos:  true,
  },
  PRO: {
    videoGenerate:  true,
    audioGenerate:  true,
    spaces:         true,
    inpaint:        true,
    upscale:        true,
    creditPacks:    true,
    priorityQueue:  true,
    soraAccess:     true,
    premiumVideos:  true,
  },
};

export function getPlanFeatures(planId: string): PlanFeatureFlags {
  return PLAN_FEATURES[planId] ?? PLAN_FEATURES["FREE"];
}

// ── Credit Packs ──────────────────────────────────────────────────────────────
// Retail pricing anchored at R$39/1000 credits.
// Volume tiers provide up to 24% discount on bulk purchases.

export interface CreditPack {
  id:            string;
  name:          string;
  credits:       number;
  bonus:         number;     // bonus credits at no extra cost
  priceBRL:      number;
  brlPer1k:      number;     // effective rate for display
  discountPct:   number;     // vs base retail rate
  minPlan:       PlanId;
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: "pack-starter", name: "Starter",
    credits: 1_000, bonus: 0, priceBRL: 39,
    brlPer1k: 39, discountPct: 0, minPlan: "ESSENTIAL",
  },
  {
    id: "pack-boost", name: "Boost",
    credits: 5_000, bonus: 500, priceBRL: 177,
    brlPer1k: 35.4, discountPct: 9, minPlan: "ESSENTIAL",
  },
  {
    id: "pack-power", name: "Power",
    credits: 15_000, bonus: 2_000, priceBRL: 499,
    brlPer1k: 33.3, discountPct: 15, minPlan: "PREMIUM",
  },
  {
    id: "pack-enterprise", name: "Enterprise",
    credits: 50_000, bonus: 10_000, priceBRL: 1_490,
    brlPer1k: 29.8, discountPct: 24, minPlan: "PRO",
  },
];

// ── Plan ordering for upgrade path ────────────────────────────────────────────
export const PLAN_ORDER: PlanId[] = ["FREE", "ESSENTIAL", "PREMIUM", "PREMIUM_PLUS", "PRO"];

export function planRank(planId: string): number {
  return PLAN_ORDER.indexOf(planId as PlanId);
}

export function meetsMinPlan(userPlan: string, minPlan: PlanId): boolean {
  return planRank(userPlan) >= planRank(minPlan);
}
