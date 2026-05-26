import { prisma } from "@/lib/prisma";
import { estimateCostUSD, USD_BRL_RATE } from "@/lib/ai-costs";
import { getFalModelId } from "@/lib/model-lookup";
import { buildModelMargins, buildUserMargins } from "./cost-engine";
import type { ModelMarginSummary, UserMarginSummary } from "./cost-engine";

// ── Raw row types (PostgreSQL returns bigint for COUNT/SUM) ───────────────────

type RawModelPlanRow = {
  model:         string;
  plan:          string;
  gen_count:     bigint;
  total_credits: bigint;
};

type RawUserModelRow = {
  user_id:       string;
  email:         string;
  plan:          string;
  model:         string;
  gen_count:     bigint;
  total_credits: bigint;
};

type RawDayModelRow = {
  day:       string;   // TO_CHAR → 'YYYY-MM-DD'
  model:     string;
  gen_count: bigint;
};

// ── Model margins ─────────────────────────────────────────────────────────────
// Groups COMPLETED generations by (model, user.plan) → computes blended margin per model.

export async function fetchModelMargins(windowDays = 30): Promise<ModelMarginSummary[]> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const rows = await prisma.$queryRaw<RawModelPlanRow[]>`
    SELECT
      g.model,
      u.plan::text                      AS plan,
      COUNT(g.id)::bigint               AS gen_count,
      SUM(g."creditsCost")::bigint      AS total_credits
    FROM "Generation" g
    JOIN "User" u ON g."userId" = u.id
    WHERE g.status = 'COMPLETED'
      AND g."createdAt" >= ${since}
    GROUP BY g.model, u.plan
    ORDER BY gen_count DESC
    LIMIT 2000
  `;

  return buildModelMargins(
    rows.map((r) => ({
      model:        r.model,
      plan:         r.plan,
      genCount:     Number(r.gen_count),
      totalCredits: Number(r.total_credits),
    }))
  );
}

// ── Deficit users ─────────────────────────────────────────────────────────────
// Fetches the users with the worst (most negative) margin in the last windowDays.

export async function fetchDeficitUsers(limit = 25, windowDays = 30): Promise<UserMarginSummary[]> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const rows = await prisma.$queryRaw<RawUserModelRow[]>`
    SELECT
      u.id::text                        AS user_id,
      u.email,
      u.plan::text                      AS plan,
      g.model,
      COUNT(g.id)::bigint               AS gen_count,
      SUM(g."creditsCost")::bigint      AS total_credits
    FROM "Generation" g
    JOIN "User" u ON g."userId" = u.id
    WHERE g.status = 'COMPLETED'
      AND g."createdAt" >= ${since}
    GROUP BY u.id, u.email, u.plan, g.model
    ORDER BY gen_count DESC
    LIMIT 5000
  `;

  const all = buildUserMargins(
    rows.map((r) => ({
      userId:       r.user_id,
      email:        r.email,
      plan:         r.plan,
      model:        r.model,
      genCount:     Number(r.gen_count),
      totalCredits: Number(r.total_credits),
    }))
  );

  return all.filter((u) => u.isDeficit).slice(0, limit);
}

// ── Pack purchase metrics ─────────────────────────────────────────────────────

export interface PackMetrics {
  totalPurchases:    number;
  totalRevenueBRL:   number;
  totalCreditsAdded: number;
  last30DayCount:    number;
  last30DayRevBRL:   number;
  byPack: Record<string, {
    packId:      string;
    count:       number;
    revenueBRL:  number;
    totalCredits: number;
  }>;
  recentPurchases: Array<{
    id:             string;
    userId:         string;
    packId:         string;
    creditsAdded:   number;
    bonusCredits:   number;
    amountPaidBRL:  number;
    createdAt:      string;
    userEmail?:     string;
  }>;
}

export async function fetchPackMetrics(): Promise<PackMetrics> {
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [all, last30, recent] = await Promise.all([
    prisma.packPurchase.findMany({
      select: { packId: true, creditsAdded: true, bonusCredits: true, amountPaidBRL: true },
    }),
    prisma.packPurchase.findMany({
      where:  { createdAt: { gte: since30 } },
      select: { packId: true, creditsAdded: true, bonusCredits: true, amountPaidBRL: true },
    }),
    prisma.packPurchase.findMany({
      take:    20,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { email: true } } },
    }),
  ]);

  const byPack: PackMetrics["byPack"] = {};
  let totalRevBRL = 0;
  let totalCredits = 0;

  for (const p of all) {
    const entry = byPack[p.packId] ?? { packId: p.packId, count: 0, revenueBRL: 0, totalCredits: 0 };
    entry.count++;
    entry.revenueBRL   += p.amountPaidBRL;
    entry.totalCredits += p.creditsAdded + p.bonusCredits;
    byPack[p.packId]    = entry;
    totalRevBRL        += p.amountPaidBRL;
    totalCredits       += p.creditsAdded + p.bonusCredits;
  }

  const last30RevBRL = last30.reduce((s, p) => s + p.amountPaidBRL, 0);

  return {
    totalPurchases:    all.length,
    totalRevenueBRL:   Math.round(totalRevBRL   * 100) / 100,
    totalCreditsAdded: totalCredits,
    last30DayCount:    last30.length,
    last30DayRevBRL:   Math.round(last30RevBRL  * 100) / 100,
    byPack,
    recentPurchases: recent.map((p) => ({
      id:            p.id,
      userId:        p.userId,
      packId:        p.packId,
      creditsAdded:  p.creditsAdded,
      bonusCredits:  p.bonusCredits,
      amountPaidBRL: p.amountPaidBRL,
      createdAt:     p.createdAt.toISOString(),
      userEmail:     (p as typeof p & { user?: { email: string } }).user?.email,
    })),
  };
}

// ── Daily cost breakdown (last N days) ────────────────────────────────────────

export interface DailyCostRow {
  day:      string;   // YYYY-MM-DD
  genCount: number;
  costUSD:  number;
  costBRL:  number;
}

export async function fetchDailyCosts(days = 7): Promise<DailyCostRow[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await prisma.$queryRaw<RawDayModelRow[]>`
    SELECT
      TO_CHAR(g."createdAt", 'YYYY-MM-DD') AS day,
      g.model,
      COUNT(g.id)::bigint                  AS gen_count
    FROM "Generation" g
    WHERE g.status = 'COMPLETED'
      AND g."createdAt" >= ${since}
    GROUP BY TO_CHAR(g."createdAt", 'YYYY-MM-DD'), g.model
    ORDER BY day DESC
    LIMIT 500
  `;

  const dayMap = new Map<string, { genCount: number; costUSD: number }>();
  for (const row of rows) {
    const count   = Number(row.gen_count);
    const falId   = getFalModelId(row.model) ?? null;
    const costUSD = estimateCostUSD(falId) * count;
    const ex      = dayMap.get(row.day) ?? { genCount: 0, costUSD: 0 };
    dayMap.set(row.day, { genCount: ex.genCount + count, costUSD: ex.costUSD + costUSD });
  }

  return Array.from(dayMap.entries())
    .map(([day, d]) => ({
      day,
      genCount: d.genCount,
      costUSD:  Math.round(d.costUSD * 10000) / 10000,
      costBRL:  Math.round(d.costUSD * USD_BRL_RATE * 100) / 100,
    }))
    .sort((a, b) => a.day.localeCompare(b.day));
}
