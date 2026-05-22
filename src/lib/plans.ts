export type PlanId = "FREE" | "ESSENTIAL" | "PREMIUM" | "PREMIUM_PLUS" | "PRO";

export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  priceMonthly: number;
  priceAnnual: number;
  credits: number;
  badge?: string;
  highlighted?: boolean;
  unlimitedModels?: string[];
  features: string[];
  stripePriceIdMonthly?: string;
  stripePriceIdAnnual?: string;
}

export const PLANS: Plan[] = [
  {
    id: "FREE",
    name: "Grátis",
    description: "Para experimentar a plataforma",
    priceMonthly: 0,
    priceAnnual: 0,
    credits: 0,
    features: [
      "Acesso ao dashboard",
      "Galeria da comunidade",
      "5 gerações de teste",
    ],
  },
  {
    id: "ESSENTIAL",
    name: "Essential",
    description: "Para criadores que estão começando a usar IA",
    priceMonthly: 10,
    priceAnnual: 7.5,
    credits: 8000,
    stripePriceIdMonthly: process.env.STRIPE_ESSENTIAL_PRICE_ID,
    stripePriceIdAnnual: process.env.STRIPE_ESSENTIAL_ANNUAL_PRICE_ID,
    features: [
      "Acesso a todos os modelos de imagem, vídeo e áudio",
      "Spaces — tela compartilhada para fluxos de trabalho",
      "Ferramentas de edição profissionais",
      "Geração de música, voz e efeitos sonoros",
    ],
  },
  {
    id: "PREMIUM",
    name: "Premium",
    description: "Para pessoas que exploram ferramentas de IA e conteúdo stock",
    priceMonthly: 20,
    priceAnnual: 15,
    credits: 20000,
    highlighted: true,
    stripePriceIdMonthly: process.env.STRIPE_PREMIUM_PRICE_ID,
    stripePriceIdAnnual: process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID,
    features: [
      "Tudo do Essential",
      "Mais de 250 milhões de fotos, vídeos, vetores e PSD",
      "Projetos ilimitados",
      "Download em alta resolução",
    ],
  },
  {
    id: "PREMIUM_PLUS",
    name: "Premium+",
    description: "Para criativos que precisam de gerações ilimitadas e acesso total",
    priceMonthly: 45,
    priceAnnual: 33.75,
    credits: 45000,
    badge: "Melhor valor",
    unlimitedModels: ["nano-banana-2", "flux2-pro", "kling-2.5", "seedream-5-lite"],
    stripePriceIdMonthly: process.env.STRIPE_PREMIUM_PLUS_PRICE_ID,
    stripePriceIdAnnual: process.env.STRIPE_PREMIUM_PLUS_ANNUAL_PRICE_ID,
    features: [
      "Tudo do Premium",
      "Gerações ilimitadas em modelos selecionados",
      "Licença comercial de IA",
      "Upscaler premium",
    ],
  },
  {
    id: "PRO",
    name: "Pro",
    description: "Para profissionais que estão expandindo a produção de conteúdo",
    priceMonthly: 280,
    priceAnnual: 210,
    credits: 300000,
    badge: "A escolha dos especialistas",
    unlimitedModels: ["nano-banana-2", "flux2-pro", "kling-2.5", "seedream-5-lite", "nano-banana-pro"],
    stripePriceIdMonthly: process.env.STRIPE_PRO_PRICE_ID,
    stripePriceIdAnnual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
    features: [
      "Tudo do Premium+",
      "Licença comercial de IA + direitos musicais",
      "Upscalers premium (Magnific + Topaz)",
      "Recarregue créditos a qualquer momento",
      "Acesso antecipado a novos recursos",
    ],
  },
];

export const PLAN_CREDITS: Record<PlanId, number> = {
  FREE: 0,
  ESSENTIAL: 8000,
  PREMIUM: 20000,
  PREMIUM_PLUS: 45000,
  PRO: 300000,
};

export function getPlan(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}

export const PLAN_LABELS: Record<PlanId, string> = {
  FREE: "Grátis",
  ESSENTIAL: "Essential",
  PREMIUM: "Premium",
  PREMIUM_PLUS: "Premium+",
  PRO: "Pro",
};
