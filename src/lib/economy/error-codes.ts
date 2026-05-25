export const ECONOMY_ERRORS = {
  INSUFFICIENT_CREDITS:  "INSUFFICIENT_CREDITS",
  COOLDOWN_ACTIVE:       "COOLDOWN_ACTIVE",
  PLAN_RESTRICTION:      "PLAN_RESTRICTION",
  CONCURRENCY_LIMIT:     "CONCURRENCY_LIMIT",
  OVERAGE_PROTECTION:    "OVERAGE_PROTECTION",
  PREMIUM_MODEL_LOCKED:  "PREMIUM_MODEL_LOCKED",
} as const;

export type EconomyErrorCode = typeof ECONOMY_ERRORS[keyof typeof ECONOMY_ERRORS];

export interface EconomyErrorPayload {
  error:     string;
  code:      EconomyErrorCode;
  required?: number;
  current?:  number;
  cooldownSeconds?: number;
  minPlan?:  string;
  limit?:    number;
  active?:   number;
}
