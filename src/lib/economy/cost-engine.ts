import { estimateCostUSD, getProvider, USD_BRL_RATE } from "@/lib/ai-costs";
import { getFalModelId } from "@/lib/model-lookup";
import { CREDIT_VALUE_BRL, EXPENSIVE_MODEL_USD } from "./pricing";

// ── Single-generation economics ───────────────────────────────────────────────

export interface GenerationEconomics {
  model:          string;
  falId:          string | null;
  provider:       string;
  creditsCharged: number;
  planId:         string;
  costPerGenUSD:  number;
  costPerGenBRL:  number;
  revenueBRL:     number;
  revenueUSD:     number;
  marginBRL:      number;
  marginUSD:      number;
  /** Margin %. -999 means no revenue base (free-plan user). */
  marginPct:      number;
  isDeficit:      boolean;
  isExpensive:    boolean;
}

export function computeGenerationEconomics(
  model: string,
  creditsCharged: number,
  planId: string,
): GenerationEconomics {
  const falId   = getFalModelId(model) ?? null;
  const costUSD = estimateCostUSD(falId);
  const costBRL = r4(costUSD * USD_BRL_RATE);
  const cVal    = CREDIT_VALUE_BRL[planId] ?? 0;
  const revBRL  = r4(creditsCharged * cVal);
  const revUSD  = r4(revBRL / USD_BRL_RATE);
  const mrgBRL  = r4(revBRL - costBRL);
  const mrgUSD  = r4(revUSD - costUSD);
  const mrgPct  = revBRL > 0 ? r2((mrgBRL / revBRL) * 100) : -999;

  return {
    model,
    falId,
    provider:       getProvider(falId ?? ""),
    creditsCharged,
    planId,
    costPerGenUSD:  costUSD,
    costPerGenBRL:  costBRL,
    revenueBRL:     revBRL,
    revenueUSD:     revUSD,
    marginBRL:      mrgBRL,
    marginUSD:      mrgUSD,
    marginPct:      mrgPct,
    isDeficit:      mrgBRL < 0,
    isExpensive:    costUSD >= EXPENSIVE_MODEL_USD,
  };
}

// ── Aggregate model margin ────────────────────────────────────────────────────

export interface ModelMarginSummary {
  model:         string;
  provider:      string;
  totalCount:    number;
  totalCostUSD:  number;
  totalCostBRL:  number;
  totalRevBRL:   number;
  totalRevUSD:   number;
  marginBRL:     number;
  marginUSD:     number;
  marginPct:     number;
  avgCostPerGen: number;  // USD per generation
  avgRevPerGen:  number;  // BRL per generation
  isDeficit:     boolean;
}

/**
 * Builds per-model margin summaries from pre-aggregated (model, plan, count, credits) rows.
 * Input rows come from a GROUP BY model, plan query — no individual generation records needed.
 */
export function buildModelMargins(
  rows: Array<{ model: string; plan: string; genCount: number; totalCredits: number }>,
): ModelMarginSummary[] {
  type Acc = { count: number; totalCostUSD: number; totalCostBRL: number; totalRevBRL: number };
  const map = new Map<string, Acc>();

  for (const row of rows) {
    const falId   = getFalModelId(row.model) ?? null;
    const costPer = estimateCostUSD(falId);
    const costUSD = costPer * row.genCount;
    const costBRL = costUSD * USD_BRL_RATE;
    const cVal    = CREDIT_VALUE_BRL[row.plan] ?? 0;
    const revBRL  = row.totalCredits * cVal;

    const ex = map.get(row.model) ?? { count: 0, totalCostUSD: 0, totalCostBRL: 0, totalRevBRL: 0 };
    map.set(row.model, {
      count:        ex.count + row.genCount,
      totalCostUSD: ex.totalCostUSD + costUSD,
      totalCostBRL: ex.totalCostBRL + costBRL,
      totalRevBRL:  ex.totalRevBRL + revBRL,
    });
  }

  const result: ModelMarginSummary[] = [];
  map.forEach((d, model) => {
    const falId  = getFalModelId(model) ?? null;
    const revUSD = d.totalRevBRL / USD_BRL_RATE;
    const mrgBRL = d.totalRevBRL - d.totalCostBRL;
    const mrgUSD = revUSD - d.totalCostUSD;
    const mrgPct = d.totalRevBRL > 0 ? r2((mrgBRL / d.totalRevBRL) * 100) : -999;

    result.push({
      model,
      provider:      getProvider(falId ?? ""),
      totalCount:    d.count,
      totalCostUSD:  r4(d.totalCostUSD),
      totalCostBRL:  r2(d.totalCostBRL),
      totalRevBRL:   r2(d.totalRevBRL),
      totalRevUSD:   r4(revUSD),
      marginBRL:     r2(mrgBRL),
      marginUSD:     r4(mrgUSD),
      marginPct:     mrgPct,
      avgCostPerGen: d.count > 0 ? r4(d.totalCostUSD / d.count) : 0,
      avgRevPerGen:  d.count > 0 ? r4(d.totalRevBRL / d.count) : 0,
      isDeficit:     mrgBRL < 0,
    });
  });

  result.sort((a, b) => b.totalCostUSD - a.totalCostUSD);
  return result;
}

// ── Aggregate user margin ─────────────────────────────────────────────────────

export interface UserMarginSummary {
  userId:       string;
  email:        string;
  plan:         string;
  totalGens:    number;
  totalCredits: number;
  totalCostUSD: number;
  totalCostBRL: number;
  totalRevBRL:  number;
  marginBRL:    number;
  marginPct:    number;
  isDeficit:    boolean;
}

/**
 * Builds per-user margin summaries from (userId, plan, model, count, credits) rows.
 * Sorted ascending by marginBRL (worst deficit first).
 */
export function buildUserMargins(
  rows: Array<{
    userId: string; email: string; plan: string;
    model: string; genCount: number; totalCredits: number;
  }>,
): UserMarginSummary[] {
  type Acc = {
    email: string; plan: string;
    totalGens: number; totalCredits: number;
    totalCostUSD: number; totalCostBRL: number; totalRevBRL: number;
  };
  const map = new Map<string, Acc>();

  for (const row of rows) {
    const falId   = getFalModelId(row.model) ?? null;
    const costPer = estimateCostUSD(falId);
    const costUSD = costPer * row.genCount;
    const costBRL = costUSD * USD_BRL_RATE;
    const cVal    = CREDIT_VALUE_BRL[row.plan] ?? 0;
    const revBRL  = row.totalCredits * cVal;

    const ex = map.get(row.userId) ?? {
      email: row.email, plan: row.plan,
      totalGens: 0, totalCredits: 0, totalCostUSD: 0, totalCostBRL: 0, totalRevBRL: 0,
    };
    map.set(row.userId, {
      ...ex,
      totalGens:    ex.totalGens + row.genCount,
      totalCredits: ex.totalCredits + row.totalCredits,
      totalCostUSD: ex.totalCostUSD + costUSD,
      totalCostBRL: ex.totalCostBRL + costBRL,
      totalRevBRL:  ex.totalRevBRL + revBRL,
    });
  }

  const result: UserMarginSummary[] = [];
  map.forEach((d, userId) => {
    const mrgBRL = d.totalRevBRL - d.totalCostBRL;
    const mrgPct = d.totalRevBRL > 0 ? r2((mrgBRL / d.totalRevBRL) * 100) : -999;
    result.push({
      userId,
      email:        d.email,
      plan:         d.plan,
      totalGens:    d.totalGens,
      totalCredits: d.totalCredits,
      totalCostUSD: r4(d.totalCostUSD),
      totalCostBRL: r2(d.totalCostBRL),
      totalRevBRL:  r2(d.totalRevBRL),
      marginBRL:    r2(mrgBRL),
      marginPct:    mrgPct,
      isDeficit:    mrgBRL < 0,
    });
  });

  result.sort((a, b) => a.marginBRL - b.marginBRL);
  return result;
}

// ── Rounding helpers ──────────────────────────────────────────────────────────
function r4(n: number): number { return Math.round(n * 10000) / 10000; }
function r2(n: number): number { return Math.round(n * 100)   / 100;   }
