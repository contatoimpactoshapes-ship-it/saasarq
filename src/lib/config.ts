import type { AiModel, PlanConfig } from "@/types";

export const AI_MODELS: AiModel[] = [
  {
    id: "auto",
    name: "Auto",
    description: "Seleção automática do melhor modelo para seu prompt",
    credits: 50,
    falModel: "fal-ai/flux/schnell",
    badge: "Rápido",
  },
  {
    id: "nano-banana-2",
    name: "Nano Banana 2",
    description: "Alta qualidade fotorrealista com estilo cinematográfico",
    credits: 80,
    falModel: "fal-ai/flux-realism",
    badge: "Popular",
  },
  {
    id: "nano-banana-pro",
    name: "Nano Banana Pro",
    description: "Qualidade máxima para apresentações premium",
    credits: 150,
    falModel: "fal-ai/flux-pro/v1.1",
    premium: true,
    badge: "Premium",
  },
  {
    id: "flux2-pro",
    name: "Flux2 Pro",
    description: "Renderizações ultra-detalhadas com física de luz avançada",
    credits: 120,
    falModel: "fal-ai/flux-pro/v1.1",
    badge: "Pro",
  },
  {
    id: "seedream-5-lite",
    name: "SeeDream 5 Lite",
    description: "Estilo artístico com composição balanceada",
    credits: 90,
    falModel: "fal-ai/seedream-5-lite",
  },
];

export const PLANS: PlanConfig[] = [
  {
    id: "FREE",
    name: "Free",
    price: 0,
    credits: 0,
    description: "Para experimentar a plataforma",
    features: [
      "Acesso básico à plataforma",
      "Galeria de inspirações",
      "Comunidade de arquitetos",
    ],
  },
  {
    id: "ESSENTIAL",
    name: "Essential",
    price: 10,
    credits: 8000,
    description: "Para profissionais em início de carreira",
    features: [
      "8.000 créditos/mês",
      "Todos os modelos básicos",
      "Histórico de 30 dias",
      "Download em alta resolução",
      "Suporte por email",
    ],
    stripePriceId: process.env.STRIPE_ESSENTIAL_PRICE_ID,
  },
  {
    id: "PREMIUM",
    name: "Premium",
    price: 20,
    credits: 20000,
    description: "Para arquitetos e designers ativos",
    features: [
      "20.000 créditos/mês",
      "Todos os modelos incluindo Premium",
      "Histórico ilimitado",
      "Projetos organizados",
      "Suporte prioritário",
    ],
    stripePriceId: process.env.STRIPE_PREMIUM_PRICE_ID,
    highlighted: true,
  },
  {
    id: "PREMIUM_PLUS",
    name: "Premium+",
    price: 45,
    credits: 45000,
    description: "Para escritórios com alta demanda",
    features: [
      "45.000 créditos/mês",
      "Nano Banana 2 e Flux2 Pro ilimitados",
      "API access",
      "Geração em lote",
      "Gerente de conta dedicado",
    ],
    stripePriceId: process.env.STRIPE_PREMIUM_PLUS_PRICE_ID,
    unlimited: ["nano-banana-2", "flux2-pro"],
  },
  {
    id: "PRO",
    name: "Pro",
    price: 280,
    credits: 300000,
    description: "Para grandes escritórios e estúdios",
    features: [
      "300.000 créditos/mês",
      "Todos os modelos ilimitados",
      "SLA garantido",
      "Integração personalizada",
      "Suporte 24/7",
      "Treinamento de equipe",
    ],
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
    unlimited: ["nano-banana-2", "nano-banana-pro", "flux2-pro", "seedream-5-lite", "auto"],
  },
];

export const PLAN_CREDITS: Record<string, number> = {
  FREE: 0,
  ESSENTIAL: 8000,
  PREMIUM: 20000,
  PREMIUM_PLUS: 45000,
  PRO: 300000,
};

export function getModelById(id: string): AiModel | undefined {
  return AI_MODELS.find((m) => m.id === id);
}

export function getPlanById(id: string): PlanConfig | undefined {
  return PLANS.find((p) => p.id === id);
}

export function canUseModel(plan: string, modelId: string): boolean {
  const model = getModelById(modelId);
  if (!model) return false;
  if (!model.premium) return true;
  return ["PREMIUM", "PREMIUM_PLUS", "PRO"].includes(plan);
}
