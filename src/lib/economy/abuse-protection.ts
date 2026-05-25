import { prisma } from "@/lib/prisma";
import { PLAN_FEATURES, VIDEO_COOLDOWN_MINUTES, OVERAGE_THRESHOLD_PCT, EXPENSIVE_MODEL_USD } from "./pricing";
import { estimateCostUSD } from "@/lib/ai-costs";
import { getFalModelId } from "@/lib/model-lookup";
import { PLAN_CREDITS } from "@/lib/plans";
import type { PlanFeatureFlags } from "./pricing";

// ── Feature flag check (pure, synchronous) ────────────────────────────────────

export function canUseFeature(planId: string, feature: keyof PlanFeatureFlags): boolean {
  const flags = PLAN_FEATURES[planId] ?? PLAN_FEATURES["FREE"];
  return flags[feature];
}

// ── Video cooldown ────────────────────────────────────────────────────────────
// Returns remaining cooldown in seconds (0 = no active cooldown).

export async function getVideoCooldownSeconds(userId: string, planId: string): Promise<number> {
  const cooldownMin = VIDEO_COOLDOWN_MINUTES[planId] ?? VIDEO_COOLDOWN_MINUTES["FREE"];
  if (cooldownMin === 0) return 0;

  const cooldownMs = cooldownMin * 60 * 1000;
  const since      = new Date(Date.now() - cooldownMs);

  const recent = await prisma.generation.findFirst({
    where: {
      userId,
      tool:      "VIDEO_GENERATE",
      status:    { in: ["COMPLETED", "PROCESSING", "PENDING"] },
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
    select:  { createdAt: true },
  });

  if (!recent) return 0;

  const elapsed   = Date.now() - recent.createdAt.getTime();
  const remaining = cooldownMs - elapsed;
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

// ── Overage detection ─────────────────────────────────────────────────────────
// Returns true when user has consumed > OVERAGE_THRESHOLD_PCT of plan allocation.
// PRO plan is never in overage (large allocation; unlimited intent).

export async function isUserInOverage(userId: string, planId: string): Promise<boolean> {
  if (planId === "PRO") return false;

  const allocation = PLAN_CREDITS[planId as keyof typeof PLAN_CREDITS] ?? 0;
  if (allocation === 0) return false;

  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { credits: true },
  });

  if (!user) return false;

  const remaining = Math.max(0, user.credits);
  const usedFrac  = 1 - remaining / allocation;
  return usedFrac > OVERAGE_THRESHOLD_PCT;
}

// ── Expensive model guard ─────────────────────────────────────────────────────
// Returns a user-facing error string when the request should be blocked, or null if allowed.

export async function checkExpensiveModelAccess(
  userId: string,
  planId: string,
  model:  string,
): Promise<string | null> {
  const falId   = getFalModelId(model) ?? null;
  const costUSD = estimateCostUSD(falId);

  if (costUSD < EXPENSIVE_MODEL_USD) return null;

  const over = await isUserInOverage(userId, planId);
  if (!over) return null;

  const pct = Math.round(OVERAGE_THRESHOLD_PCT * 100);
  return (
    `Você usou mais de ${pct}% dos seus créditos mensais. ` +
    `Modelos premium estão temporariamente bloqueados. ` +
    `Faça upgrade do plano ou aguarde a renovação para continuar.`
  );
}
