export type { PlanFeatureFlags, CreditPack } from "./pricing";
export {
  RETAIL_BRL_PER_1K,
  RETAIL_BRL_PER_CREDIT,
  CREDIT_VALUE_BRL,
  EXPENSIVE_MODEL_USD,
  OVERAGE_THRESHOLD_PCT,
  DEFICIT_ALERT_THRESHOLD_BRL,
  LOW_BALANCE_THRESHOLD_PCT,
  VIDEO_COOLDOWN_MINUTES,
  CONCURRENCY_LIMITS,
  ROLLOVER_PCT,
  PLAN_FEATURES,
  getPlanFeatures,
  CREDIT_PACKS,
  PLAN_ORDER,
  planRank,
  meetsMinPlan,
} from "./pricing";

export type { GenerationEconomics, ModelMarginSummary, UserMarginSummary } from "./cost-engine";
export { computeGenerationEconomics, buildModelMargins, buildUserMargins } from "./cost-engine";

export type { DailyCostRow } from "./margin-engine";
export { fetchModelMargins, fetchDeficitUsers, fetchDailyCosts } from "./margin-engine";

export {
  canUseFeature,
  getVideoCooldownSeconds,
  isUserInOverage,
  checkExpensiveModelAccess,
} from "./abuse-protection";

export { checkConcurrencyLimit } from "./concurrency";

export type { EconomyErrorCode, EconomyErrorPayload } from "./error-codes";
export { ECONOMY_ERRORS } from "./error-codes";
