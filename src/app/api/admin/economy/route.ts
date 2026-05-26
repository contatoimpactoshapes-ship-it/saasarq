import { NextResponse } from "next/server";
import { requireAdmin, handleAdminError } from "@/lib/admin";
import { fetchModelMargins, fetchDeficitUsers, fetchDailyCosts, fetchPackMetrics } from "@/lib/economy/margin-engine";
import { CREDIT_VALUE_BRL, PLAN_FEATURES, CREDIT_PACKS } from "@/lib/economy/pricing";
import { USD_BRL_RATE } from "@/lib/ai-costs";
import { PLANS } from "@/lib/plans";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();

    const [modelMargins, deficitUsers, dailyCosts, packMetrics] = await Promise.all([
      fetchModelMargins(30),
      fetchDeficitUsers(25, 30),
      fetchDailyCosts(7),
      fetchPackMetrics(),
    ]);

    // ── Platform totals (derived from model margins) ──────────────────────────
    const totalCostUSD = modelMargins.reduce((s, m) => s + m.totalCostUSD, 0);
    const totalCostBRL = modelMargins.reduce((s, m) => s + m.totalCostBRL, 0);
    const totalRevBRL  = modelMargins.reduce((s, m) => s + m.totalRevBRL, 0);
    const totalGens    = modelMargins.reduce((s, m) => s + m.totalCount, 0);
    const totalRevUSD  = totalRevBRL / USD_BRL_RATE;
    const marginBRL    = totalRevBRL - totalCostBRL;
    const marginUSD    = totalRevUSD - totalCostUSD;
    const marginPct    = totalRevBRL > 0
      ? Math.round((marginBRL / totalRevBRL) * 10000) / 100
      : -999;
    const roiPct = totalCostBRL > 0
      ? Math.round((marginBRL / totalCostBRL) * 10000) / 100
      : 0;

    // ── Credit value reference table ──────────────────────────────────────────
    const creditValueTable = PLANS.map((p) => ({
      plan:         p.id,
      name:         p.name,
      priceMonthly: p.priceMonthly,
      credits:      p.credits,
      brlPerCredit: CREDIT_VALUE_BRL[p.id] ?? 0,
    }));

    return NextResponse.json({
      platform: {
        windowDays:       30,
        totalGens,
        totalCostUSD:     Math.round(totalCostUSD * 10000) / 10000,
        totalCostBRL:     Math.round(totalCostBRL * 100) / 100,
        totalRevBRL:      Math.round(totalRevBRL  * 100) / 100,
        totalRevUSD:      Math.round(totalRevUSD  * 10000) / 10000,
        marginBRL:        Math.round(marginBRL    * 100) / 100,
        marginUSD:        Math.round(marginUSD    * 10000) / 10000,
        marginPct,
        roiPct,
        deficitUserCount: deficitUsers.length,
      },
      modelMargins,
      deficitUsers,
      dailyCosts,
      packMetrics,
      creditValueTable,
      planFeatures:  PLAN_FEATURES,
      creditPacks:   CREDIT_PACKS,
      usdBrlRate:    USD_BRL_RATE,
      computedAt:    new Date().toISOString(),
    });
  } catch (err) {
    return handleAdminError(err);
  }
}
