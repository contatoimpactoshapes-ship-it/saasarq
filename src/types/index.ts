export type Plan = "FREE" | "ESSENTIAL" | "PREMIUM" | "PREMIUM_PLUS" | "PRO";
export type GenerationStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
export type TransactionType = "PURCHASE" | "DEBIT" | "REFUND" | "BONUS";

export interface AiModel {
  id: string;
  name: string;
  description: string;
  credits: number;
  falModel: string;
  premium?: boolean;
  badge?: string;
}

export interface PlanConfig {
  id: Plan;
  name: string;
  price: number;
  credits: number;
  description: string;
  features: string[];
  stripePriceId?: string;
  highlighted?: boolean;
  unlimited?: AiModel["id"][];
}

export interface Generation {
  id: string;
  userId: string;
  tool: string;
  model: string;
  prompt: string;
  parameters: Record<string, unknown>;
  status: GenerationStatus;
  outputUrls: string[];
  creditsCost: number;
  falRequestId?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  clerkId: string;
  email: string;
  plan: Plan;
  credits: number;
  stripeCustomerId?: string | null;
  stripeSubId?: string | null;
  createdAt: string;
  updatedAt: string;
}
